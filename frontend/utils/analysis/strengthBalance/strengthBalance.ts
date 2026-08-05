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
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Tolerance for band-boundary comparisons. e1RM ratios of round weights
 * (e.g. row 95kg / bench 100kg = 0.95 exactly) can land a float-epsilon
 * above the boundary, which would flip a boundary "ok" into a "watch".
 */
export const BAND_EPS = 1e-9;

interface SessionBest {
  value: number;
  title: string;
  date: number;
}

/**
 * The 90-day window is anchored to the newest valid session in the provided
 * data (not the clock), so calendar filters that exclude the last 90 days
 * still produce findings for the period the user is looking at. Mirrors the
 * hypertrophyEffectiveNow pattern in Dashboard.tsx. Warmup sets and
 * future-dated sets are skipped — a single mis-dated import shouldn't shift
 * the whole window forward and exclude real sessions. Falls back to `now`
 * when the data carries no usable parsed dates.
 */
const getWindowAnchor = (data: WorkoutSet[], now: Date): number => {
  let max = -Infinity;
  const nowTs = now.getTime();
  for (const set of data) {
    if (!set.parsedDate || isWarmupSet(set)) continue;
    const t = set.parsedDate.getTime();
    if (t > nowTs) continue;
    if (t > max) max = t;
  }
  return Number.isFinite(max) ? max : nowTs;
};

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
  /** All per-session bests inside the window, used for weekly ratio history. */
  sessionBests: SessionBest[];
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
  windowStart: number,
  windowEnd: number
): MovementStrength | null => {
  const sessionBests = new Map<string, SessionBest>();

  for (const set of sets) {
    if (!set.parsedDate) continue;
    const t = set.parsedDate.getTime();
    if (t < windowStart || t > windowEnd) continue;
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
        date: t,
      });
    }
  }

  if (sessionBests.size < MIN_SESSIONS_PER_MOVEMENT) return null;

  // Strength = p75 of the most recent 5 session bests (per spec §4.1), robust
  // to one-off PRs and stale peaks: a heavy block 80 days ago no longer wins
  // over recent work.
  const mostRecent = Array.from(sessionBests.values()).sort((a, b) => b.date - a.date).slice(0, MAX_SESSIONS_PER_MOVEMENT);
  const byValue = [...mostRecent].sort((a, b) => a.value - b.value);
  const strength = percentile(byValue.map((e) => e.value), 0.75);

  // Name the session that produced the reported strength (p75 of the recent
  // sessions), so the clickable title matches the number.
  const pctIndex = Math.round(0.75 * (byValue.length - 1));
  const representative = byValue[Math.max(0, Math.min(pctIndex, byValue.length - 1))];

  return {
    movement,
    strengthKg: strength,
    sessions: sessionBests.size,
    bestExerciseTitle: representative?.title ?? '',
    sessionBests: Array.from(sessionBests.values()),
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
  /** Research strength of the pair's band itself (separate from severity). */
  researchConfidence: StrengthPair['researchConfidence'];
  aSessions: number;
  bSessions: number;
  aExerciseTitle: string;
  bExerciseTitle: string;
  /** Weekly ratio series over the window (weeks where both movements were trained). */
  history: { weekStart: number; ratio: number }[];
}

const getPairSeverity = (pair: StrengthPair, ratio: number): StrengthBalancePairResult['severity'] => {
  if (ratio < pair.expectedMin - BAND_EPS || ratio > pair.expectedMax + BAND_EPS) {
    if (ratio < pair.hardMin - BAND_EPS || ratio > pair.hardMax + BAND_EPS) return 'flag';
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

  const windowEnd = getWindowAnchor(data, now);
  const windowStart = windowEnd - (STRENGTH_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000;

  const movementSets = new Map<MovementId, WorkoutSet[]>();
  for (const movement of STRENGTH_MOVEMENTS) {
    movementSets.set(movement.id, collectMovementSets(data, movement.id, assetsMap));
  }

  const strengths = new Map<MovementId, MovementStrength>();
  for (const movement of STRENGTH_MOVEMENTS) {
    const result = computeMovementStrength(movementSets.get(movement.id) ?? [], movement.id, assetsMap, windowStart, windowEnd);
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
      researchConfidence: pair.researchConfidence,
      aSessions: a.sessions,
      bSessions: b.sessions,
      aExerciseTitle: a.bestExerciseTitle,
      bExerciseTitle: b.bestExerciseTitle,
      history: buildPairHistory(a.sessionBests, b.sessionBests),
    });
  }

  return results;
};

/**
 * Weekly ratio series: for each 7-day bucket (epoch-aligned weeks) where both
 * movements were trained, ratio = best A e1RM that week / best B e1RM that
 * week. Sorted oldest → newest so it can be drawn as a trend sparkline.
 */
const buildPairHistory = (a: SessionBest[], b: SessionBest[]): StrengthBalancePairResult['history'] => {
  const aWeekly = new Map<number, number>();
  for (const sb of a) {
    const week = Math.floor(sb.date / WEEK_MS);
    const cur = aWeekly.get(week) ?? 0;
    if (sb.value > cur) aWeekly.set(week, sb.value);
  }

  const bWeekly = new Map<number, number>();
  for (const sb of b) {
    const week = Math.floor(sb.date / WEEK_MS);
    const cur = bWeekly.get(week) ?? 0;
    if (sb.value > cur) bWeekly.set(week, sb.value);
  }

  const history: StrengthBalancePairResult['history'] = [];
  for (const [week, aValue] of aWeekly) {
    const bValue = bWeekly.get(week);
    if (bValue && aValue > 0 && bValue > 0) {
      history.push({ weekStart: week * WEEK_MS, ratio: aValue / bValue });
    }
  }
  return history.sort((x, y) => x.weekStart - y.weekStart);
};

export const getLaggardMovement = (result: StrengthBalancePairResult): MovementId => {
  // The laggard is the side that sits behind its typical band. Keying off the
  // expected band (not the hard band) keeps watch-tier findings framed in the
  // right direction too.
  return result.ratio < result.pair.expectedMin - BAND_EPS ? result.pair.a : result.pair.b;
};

export const getPairOvershoot = (pair: StrengthPair, ratio: number): number => {
  if (ratio > pair.hardMax + BAND_EPS) return ratio / pair.hardMax - 1;
  if (ratio < pair.hardMin - BAND_EPS) return pair.hardMin / ratio - 1;
  return 0;
};

/**
 * Picks up to `max` findings to surface, prioritizing high-confidence (flag)
 * pairs first, then medium-confidence (watch) pairs. Whenever any watch
 * exists, at least one slot is reserved for it so borderline imbalances
 * stay visible.
 *
 * Findings are deduped by laggard movement: bench can appear in six pairs,
 * so without dedup the top findings could repeat "your bench is behind…"
 * three times. Each laggard movement surfaces at most once, preferring the
 * pair with the largest deviation. Flags are filled first (reserving one
 * slot for a watch), so a dedup collision can never cost a distinct flag
 * its slot in favor of a watch.
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
  const seenLaggards = new Set<MovementId>();
  const push = (r: StrengthBalancePairResult) => {
    const laggard = getLaggardMovement(r);
    if (seenLaggards.has(laggard)) return;
    seenLaggards.add(laggard);
    selected.push(r);
  };

  // Flags first, reserving one slot so a watch can still surface when any
  // exists (even at max=1, a flag never yields its slot to a watch).
  flags.slice(0, Math.min(flags.length, Math.max(1, max - 1))).forEach(push);

  // At least one watch stays visible when watches exist.
  if (watches.length > 0 && selected.length < max) push(watches[0]);

  // Fill remaining slots with remaining flags, then remaining watches.
  if (selected.length < max) {
    for (const f of flags) push(f);
  }
  if (selected.length < max) {
    for (const w of watches) push(w);
  }

  return selected.slice(0, max);
};
