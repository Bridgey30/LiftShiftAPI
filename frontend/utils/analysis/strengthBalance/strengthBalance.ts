import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../data/exerciseAssets';
import { isWarmupSet } from '../classification';
import { percentile } from '../masterAlgorithm/masterAlgorithmMath';
import { stripExerciseSourceLabel } from '../../exercise/exerciseSourceLabel';
import { createExerciseNameResolver, type ExerciseNameResolver } from '../../exercise/exerciseNameResolver';
import {
  STRENGTH_MOVEMENTS,
  STRENGTH_PAIRS,
  getMovementForCanonicalName,
  getStrengthMovement,
  type MovementId,
  type StrengthPair,
} from './ratioRegistry';

export const STRENGTH_WINDOW_DAYS = 90;
const MAX_SESSIONS_PER_MOVEMENT = 5;
const MIN_SESSIONS_PER_MOVEMENT = 2;
const MIN_TOTAL_SESSIONS = 3;
const MIN_REPS = 5;
const MAX_REPS = 15;

const estimateOneRepMax = (weightKg: number, reps: number): number => {
  if (weightKg <= 0 || reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
};

let resolverCacheRef: Map<string, ExerciseAsset> | null = null;
let resolverCache: ExerciseNameResolver | null = null;

const getCanonicalResolver = (assetsMap: Map<string, ExerciseAsset>): ExerciseNameResolver => {
  if (resolverCacheRef === assetsMap && resolverCache) return resolverCache;
  resolverCache = createExerciseNameResolver(Array.from(assetsMap.keys()));
  resolverCacheRef = assetsMap;
  return resolverCache;
};

export const resolveCanonicalName = (
  exerciseTitle: string,
  assetsMap: Map<string, ExerciseAsset>
): string | null => {
  if (!exerciseTitle) return null;

  const stripped = stripExerciseSourceLabel(exerciseTitle);
  if (getMovementForCanonicalName(stripped)) return stripped;

  const resolution = getCanonicalResolver(assetsMap).resolve(stripped);
  if (resolution.method === 'none' || !resolution.name) return null;
  return resolution.name;
};

export const resolveExerciseToMovement = (
  exerciseTitle: string,
  assetsMap: Map<string, ExerciseAsset>
): MovementId | undefined => {
  const canonical = resolveCanonicalName(exerciseTitle, assetsMap);
  if (!canonical) return undefined;
  return getMovementForCanonicalName(canonical);
};

const isUnilateralCanonicalName = (canonicalName: string, movement: MovementId): boolean => {
  const names = getStrengthMovement(movement)?.unilateralNames;
  if (!names || names.length === 0) return false;
  const lower = canonicalName.toLowerCase();
  return names.some((n) => n.toLowerCase() === lower);
};

export interface MovementStrength {
  movement: MovementId;
  strengthKg: number;
  sessions: number;
  bestExerciseTitle: string;
}

const collectMovementSets = (
  data: WorkoutSet[],
  movement: MovementId,
  assetsMap: Map<string, ExerciseAsset>
): WorkoutSet[] => {
  const result: WorkoutSet[] = [];
  for (const set of data) {
    if (resolveExerciseToMovement(set.exercise_title, assetsMap) !== movement) continue;
    result.push(set);
  }
  return result;
};

const computeMovementStrength = (
  sets: WorkoutSet[],
  movement: MovementId,
  assetsMap: Map<string, ExerciseAsset>,
  now: Date
): MovementStrength | null => {
  const windowStart = new Date(now.getTime() - STRENGTH_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  interface SessionBest {
    value: number;
    title: string;
    date: number;
  }
  const sessionBests = new Map<string, SessionBest>();

  for (const set of sets) {
    if (!set.parsedDate) continue;
    if (set.parsedDate < windowStart || set.parsedDate > now) continue;
    if (isWarmupSet(set)) continue;
    if (!set.weight_kg || set.weight_kg <= 0) continue;
    if (!set.reps || set.reps < MIN_REPS || set.reps > MAX_REPS) continue;

    const canonical = resolveCanonicalName(set.exercise_title, assetsMap);
    const multiplier = canonical && isUnilateralCanonicalName(canonical, movement) ? 2 : 1;
    const e1rm = estimateOneRepMax(set.weight_kg, set.reps) * multiplier;
    if (e1rm <= 0) continue;

    const sessionKey = set.parsedDate.toDateString();
    const existing = sessionBests.get(sessionKey);
    if (!existing || e1rm > existing.value) {
      sessionBests.set(sessionKey, {
        value: e1rm,
        title: set.exercise_title,
        date: set.parsedDate.getTime(),
      });
    }
  }

  if (sessionBests.size < MIN_SESSIONS_PER_MOVEMENT) return null;

  const sorted = Array.from(sessionBests.values()).sort((a, b) => a.value - b.value);
  const recent = sorted.slice(-MAX_SESSIONS_PER_MOVEMENT);
  const strength = percentile(recent.map((e) => e.value), 0.75);

  // Name the session that produced the reported strength (p75 of the top-5
  // session bests), so the clickable title matches the number.
  const pctIndex = Math.round(0.75 * (recent.length - 1));
  const representative = recent[Math.max(0, Math.min(pctIndex, recent.length - 1))];

  return {
    movement,
    strengthKg: strength,
    sessions: sessionBests.size,
    bestExerciseTitle: representative?.title ?? '',
  };
};

export interface StrengthBalancePairResult {
  pair: StrengthPair;
  aStrengthKg: number;
  bStrengthKg: number;
  ratio: number;
  severity: 'ok' | 'watch' | 'flag';
  /** User-facing confidence of the finding: flag → high, watch → medium. */
  confidence: 'high' | 'medium';
  aSessions: number;
  bSessions: number;
  aExerciseTitle: string;
  bExerciseTitle: string;
}

const getPairSeverity = (pair: StrengthPair, ratio: number): StrengthBalancePairResult['severity'] => {
  if (ratio < pair.expectedMin || ratio > pair.expectedMax) {
    if (ratio < pair.hardMin || ratio > pair.hardMax) return 'flag';
    return 'watch';
  }
  return 'ok';
};

export const computeStrengthBalance = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  now: Date
): StrengthBalancePairResult[] => {
  if (!assetsMap || data.length === 0) return [];

  const sessionCount = new Set<string>();
  for (const set of data) {
    if (!set.parsedDate || isWarmupSet(set)) continue;
    sessionCount.add(set.parsedDate.toDateString());
  }
  if (sessionCount.size < MIN_TOTAL_SESSIONS) return [];

  const movementSets = new Map<MovementId, WorkoutSet[]>();
  for (const movement of STRENGTH_MOVEMENTS) {
    movementSets.set(movement.id, collectMovementSets(data, movement.id, assetsMap));
  }

  const strengths = new Map<MovementId, MovementStrength>();
  for (const movement of STRENGTH_MOVEMENTS) {
    const result = computeMovementStrength(movementSets.get(movement.id) ?? [], movement.id, assetsMap, now);
    if (result) strengths.set(movement.id, result);
  }

  const results: StrengthBalancePairResult[] = [];

  for (const pair of STRENGTH_PAIRS) {
    const a = strengths.get(pair.a);
    const b = strengths.get(pair.b);
    if (!a || !b || a.strengthKg <= 0 || b.strengthKg <= 0) continue;

    const ratio = a.strengthKg / b.strengthKg;
    const severity = getPairSeverity(pair, ratio);
    results.push({
      pair,
      aStrengthKg: a.strengthKg,
      bStrengthKg: b.strengthKg,
      ratio,
      severity,
      confidence: severity === 'flag' ? 'high' : 'medium',
      aSessions: a.sessions,
      bSessions: b.sessions,
      aExerciseTitle: a.bestExerciseTitle,
      bExerciseTitle: b.bestExerciseTitle,
    });
  }

  return results;
};

export const getPairOvershoot = (pair: StrengthPair, ratio: number): number => {
  if (ratio > pair.hardMax) return ratio / pair.hardMax - 1;
  if (ratio < pair.hardMin) return pair.hardMin / ratio - 1;
  return 0;
};

/**
 * Picks up to `max` findings to surface, prioritizing high-confidence (flag)
 * pairs first, then medium-confidence (watch) pairs. Whenever any watch
 * exists, at least one slot is reserved for it so borderline imbalances
 * stay visible.
 */
export const pickTopFindings = (
  results: StrengthBalancePairResult[],
  max = 3
): StrengthBalancePairResult[] => {
  const byDeviation = (list: StrengthBalancePairResult[]) =>
    [...list].sort((a, b) => getPairOvershoot(b.pair, b.ratio) - getPairOvershoot(a.pair, a.ratio));

  const flags = byDeviation(results.filter((r) => r.severity === 'flag'));
  const watches = byDeviation(results.filter((r) => r.severity === 'watch'));

  const selected: StrengthBalancePairResult[] = [];

  const flagSlots = Math.min(flags.length, 2);
  selected.push(...flags.slice(0, flagSlots));

  const watchSlots = watches.length > 0 ? Math.max(1, max - selected.length) : 0;
  selected.push(...watches.slice(0, Math.min(watchSlots, max - selected.length)));

  if (selected.length < max && flags.length > flagSlots) {
    selected.push(...flags.slice(flagSlots, flagSlots + (max - selected.length)));
  }

  return selected.slice(0, max);
};
