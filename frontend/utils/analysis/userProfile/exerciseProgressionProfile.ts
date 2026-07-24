import type { WorkoutSet } from '../../../types';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import { convertWeight } from '../../../utils/format/units';
import { COMMENTARY_CONFIG } from '../config/commentaryConfig';
import { isWarmupSet } from '../classification';

export interface ExerciseProgressionProfile {
  availableWeights: number[];
  preferredJump: number;
  avgRepsRecent: number;
  repTarget: number;
  repCeiling: number;
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const roundToStep = (value: number, step: number): number => {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
};

const collectRecentSessions = (sets: WorkoutSet[]): WorkoutSet[][] => {
  const sessionMap = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    if (!s.parsedDate) continue;
    if (isWarmupSet(s)) continue;
    if (!Number.isFinite(s.weight_kg) || !Number.isFinite(s.reps)) continue;
    if (s.weight_kg <= 0 || s.reps <= 0) continue;
    const key = s.parsedDate.toDateString();
    if (!sessionMap.has(key)) sessionMap.set(key, []);
    sessionMap.get(key)!.push(s);
  }

  return Array.from(sessionMap.values())
    .sort((a, b) => (b[0]?.parsedDate?.getTime() ?? 0) - (a[0]?.parsedDate?.getTime() ?? 0))
    .slice(0, COMMENTARY_CONFIG.maxSessionsForAnalysis);
};

const nearestByDirection = (
  currentWeight: number,
  availableWeights: number[],
  preferredJump: number,
  direction: 'up' | 'down'
): number => {
  const step = Math.max(0.5, preferredJump || 0.5);
  const target = direction === 'up' ? currentWeight + step : Math.max(0, currentWeight - step);
  const directional = availableWeights.filter((w) => (direction === 'up' ? w > currentWeight : w < currentWeight));
  if (directional.length === 0) return target;

  let best = directional[0];
  let bestDist = Math.abs(best - target);
  for (const w of directional) {
    const dist = Math.abs(w - target);
    if (dist < bestDist) {
      best = w;
      bestDist = dist;
    }
  }
  return best;
};

export const buildExerciseProgressionProfile = (
  sets: WorkoutSet[],
  weightUnit: WeightUnit,
  isCompound: boolean
): ExerciseProgressionProfile | null => {
  const sessions = collectRecentSessions(sets);
  if (sessions.length === 0) return null;

  const allWorking = sessions.flat();
  const availableWeights = [...new Set(allWorking.map((s) => convertWeight(s.weight_kg, weightUnit)))].sort((a, b) => a - b);
  if (availableWeights.length === 0) return null;

  const allReps = allWorking.map((s) => s.reps).filter((r) => Number.isFinite(r) && r > 0);
  if (allReps.length === 0) return null;

  const avgRepsRecent = Math.round(allReps.reduce((a, b) => a + b, 0) / allReps.length);
  const fallbackCeiling = isCompound
    ? COMMENTARY_CONFIG.progression.compoundRepCeiling
    : COMMENTARY_CONFIG.progression.isolationRepCeiling;
  const repCeiling = Math.min(fallbackCeiling, Math.max(3, avgRepsRecent + 1));
  const repTarget = Math.max(3, Math.min(repCeiling, avgRepsRecent));

  const observedJumps: number[] = [];
  for (const session of sessions) {
    const uniqueSessionWeights = [...new Set(session.map((s) => convertWeight(s.weight_kg, weightUnit)))].sort((a, b) => a - b);
    for (let i = 1; i < uniqueSessionWeights.length; i++) {
      const delta = uniqueSessionWeights[i] - uniqueSessionWeights[i - 1];
      if (delta > 0) observedJumps.push(delta);
    }
  }

  const baseStep = COMMENTARY_CONFIG.progression.weightJumpRounding;
  const standardJump = weightUnit === 'lbs' ? 5 : 2.5;
  const preferredJump = observedJumps.length > 0
    ? Math.max(baseStep, roundToStep(median(observedJumps), baseStep))
    : standardJump;

  return {
    availableWeights,
    preferredJump,
    avgRepsRecent,
    repTarget,
    repCeiling,
  };
};

export const getSuggestedWeightForTarget = (
  profile: ExerciseProgressionProfile,
  currentWeight: number,
  direction: 'up' | 'down' | 'same'
): number => {
  if (direction === 'same') return currentWeight;
  return nearestByDirection(currentWeight, profile.availableWeights, profile.preferredJump, direction);
};
