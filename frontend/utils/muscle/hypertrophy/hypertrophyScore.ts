/**
 * Hypertrophy Score Calculation
 *
 * 3-factor formula:
 * - Volume (V): 50% - Weekly sets → possible gains % (diminishing returns model)
 * - Progress (P): 40% - Per-exercise strength trend, weighted by set distribution
 * - Frequency (F): 10% - Training days per week per muscle
 *
 * Formula: Total = V×0.50 + P×0.40 + F×0.10
 * Each factor normalized 0-100, then weighted into final 0-100 score.
 */

import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../data/exerciseAssets';
import type { ExerciseStats } from '../../../types';
import { calculateEpley1RM } from '../../analysis/masterAlgorithm/masterAlgorithmMath';
import { isWarmupSet, getWeeklyVolumeSetWeight } from '../../analysis/classification';
import { getMuscleContributionsFromAsset } from '../analytics/muscleContributions';
import { getVolumeThresholds, type TrainingLevel } from './muscleParams';
import { weeklyStimulusFromThresholds } from './hypertrophyCalculations';
import { lookupAsset, getLowerMap } from '../analytics/muscleAnalyticsHelpers';
import { CSV_TO_SVG_MUSCLE_MAP_LOWERCASE } from '../mapping/muscleCsvMappings';
import { DETAILED_SVG_ID_TO_MUSCLE_ID } from '../mapping/muscleSvgMappings';
import { MUSCLE_NAMES, type MuscleId } from '../mapping/muscleHeadless';
import { analyzeExerciseTrendCore, type ExerciseTrendCoreResult } from '../../analysis/exerciseTrend/exerciseTrendCore';

/**
 * Map a raw muscle name (from exercise assets) to headless MuscleIds.
 * Uses the same CSV → SVG → MuscleId chain as the lifetime achievement view.
 */
function getMuscleIdsFromRawName(rawMuscle: string): MuscleId[] {
  const lower = rawMuscle.toLowerCase().trim();
  const svgIds = CSV_TO_SVG_MUSCLE_MAP_LOWERCASE[lower];
  if (!svgIds) return [];
  
  const muscleIds = new Set<MuscleId>();
  for (const svgId of svgIds) {
    const muscleId = DETAILED_SVG_ID_TO_MUSCLE_ID[svgId];
    if (muscleId) {
      muscleIds.add(muscleId);
    }
  }
  return Array.from(muscleIds);
}

// ============================================================================
// Types
// ============================================================================

export interface HypertrophyFactorScores {
  /** Volume Score (0-100) - weekly sets vs MEV/MRV */
  volumeScore: number;
  /** Progressive Overload (0-100) - % change in avg 1RM */
  progressiveOverload: number;
  /** Frequency (0-100) - days per week vs optimal */
  frequency: number;
}

export interface HypertrophyScoreResult extends HypertrophyFactorScores {
  /** Total weighted score (0-100) */
  totalScore: number;
  /** Raw data for debugging */
  raw: {
    weeklySets: number;
    avgOneRM: number;
    oneRMTrend: number;
    daysPerWeek: number;
  };
}

export interface MuscleHypertrophyData {
  muscleId: string;
  muscleName: string;
  score: HypertrophyScoreResult;
}

// ============================================================================
// Constants
// ============================================================================

/** Factor weights (must sum to 1.0) */
export const FACTOR_WEIGHTS = {
  volumeScore: 0.50,
  progressiveOverload: 0.40,
  frequency: 0.10,
} as const;

/** Color coding for each factor */
export const FACTOR_COLORS = {
  volumeScore: '#3b82f6',      // Blue - most important
  progressiveOverload: '#a78bfa', // Violet - progression
  frequency: '#22d3ee',       // Cyan - frequency
} as const;

/** Factor labels for display */
export const FACTOR_LABELS = {
  volumeScore: 'Volume',
  progressiveOverload: 'Progress',
  frequency: 'Frequency',
} as const;

/** Optimal frequency reference (days per week) */
const OPTIMAL_FREQUENCY = 2.5;

/**
 * Baseline score for progressive overload when trend is 0% (no change).
 * Represents the score for maintaining strength without regression.
 * Higher for advanced lifters — maintenance is a real achievement.
 * Lower for beginners — they should be progressing, not stalling.
 */
function getProgressBaselineScore(trainingLevel: TrainingLevel = 'intermediate'): number {
  switch (trainingLevel) {
    case 'beginner':     return 8;
    case 'intermediate': return 12;
    case 'advanced':     return 18;
  }
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate Volume Score (0-100)
 * Based on weekly sets vs MEV/MRV thresholds
 */
export function calculateVolumeScore(weeklySets: number, trainingLevel: TrainingLevel = 'intermediate'): number {
  const thresholds = getVolumeThresholds(trainingLevel);
  
  if (weeklySets <= 0) return 0;
  if (weeklySets >= thresholds.maxv) return 100;
  
  // Score ramps up from MV to MaxV
  // Below MEV: reduced gains (0-50 score)
  // MEV to MRV: good gains (50-80 score)
  // MRV to MaxV: optimal gains (80-100 score)
  
  if (weeklySets < thresholds.mev) {
    // 0 sets = 0, MV sets = 25, MEV sets = 50
    const mvScore = 25;
    const progress = (weeklySets - thresholds.mv) / (thresholds.mev - thresholds.mv);
    return Math.max(0, Math.min(50, mvScore + progress * 25));
  }
  
  if (weeklySets < thresholds.mrv) {
    // MEV to MRV = 50 to 80
    const progress = (weeklySets - thresholds.mev) / (thresholds.mrv - thresholds.mev);
    return 50 + progress * 30;
  }
  
  // MRV to MaxV = 80 to 100
  const progress = (weeklySets - thresholds.mrv) / (thresholds.maxv - thresholds.mrv);
  return 80 + progress * 20;
}

/**
 * Calculate Progressive Overload Score (0-40, 40% weight)
 * - maxTrend (qualified muscles, ≥10% default) → 40 points
 * - 0% trend → PROGRESS_BASELINE_SCORE points (stable baseline)
 * - minTrend (qualified muscles, ≤-5% default) → 0 points
 * - All values clamped to 0-40, no negative scores possible
 */
function calculateProgressiveOverloadScore(
  oneRMTrendPercent: number,
  maxTrend: number,
  minTrend: number,
  trainingLevel: TrainingLevel = 'intermediate'
): number {
  const baseline = getProgressBaselineScore(trainingLevel);

  // Handle case with no positive trends (all ≤0)
  if (maxTrend <= 0) {
    if (oneRMTrendPercent >= 0) return baseline;
    const safeMin = Math.min(minTrend, 0);
    const ratio = (oneRMTrendPercent - safeMin) / (0 - safeMin);
    return Math.max(0, Math.round(ratio * baseline));
  }

  // Clamp to max (40) if trend meets/exceeds upper bound
  if (oneRMTrendPercent >= maxTrend) return 40;

  // Clamp to min (0) if trend meets/exceeds lower bound
  if (oneRMTrendPercent <= minTrend) return 0;

  // Negative trend: scale 0 (minTrend) → baseline (0% trend)
  if (oneRMTrendPercent <= 0) {
    const ratio = (oneRMTrendPercent - minTrend) / (0 - minTrend);
    return Math.max(0, Math.round(ratio * baseline));
  }

  // Positive trend: scale baseline (0% trend) → 40 (maxTrend)
  const ratio = oneRMTrendPercent / maxTrend;
  const range = 40 - baseline;
  return Math.max(0, Math.round(baseline + ratio * range));
}

/**
 * Calculate Frequency Score (0-100)
 * 3 days/week = 100 (optimal), above 3 penalizes (recovery concern).
 * Day counts if muscle got ≥1 working set that day.
 */
export function calculateFrequencyScore(
  daysPerWeek: number,
  weeklySets: number,
  trainingLevel: TrainingLevel = 'intermediate'
): number {
  if (daysPerWeek <= 0) return 0;
  const OPTIMAL = 3;
  if (daysPerWeek <= OPTIMAL) {
    return Math.round((daysPerWeek / OPTIMAL) * 100);
  }
  // Only penalize high frequency when volume exceeds recovery capacity (MRV)
  const thresholds = getVolumeThresholds(trainingLevel);
  if (weeklySets <= thresholds.mrv) {
    return 100;
  }
  // Above optimal + over MRV: penalize ~5 points per extra day, floor at 60
  return Math.max(60, Math.round(100 - (daysPerWeek - OPTIMAL) * 10));
}

// ============================================================================
// Main API
// ============================================================================

interface SetWithOneRM extends WorkoutSet {
  oneRM: number;
}

/**
 * Calculate hypertrophy score for a specific muscle group
 * @param effectiveNow - Reference date for window calculations. Defaults to the
 *   latest date found in the passed sets (so stale CSV data scores correctly).
 * @param trendWindowDays - Days to look back for progressive overload trend.
 *   Defaults to 28 (4 weeks). Larger values suit longer filter windows.
 */
export function calculateMuscleHypertrophyScore(
  muscleId: string,
  muscleName: string,
  sets: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  trainingLevel: TrainingLevel = 'intermediate',
  effectiveNow?: Date,
  trendWindowDays: number = 28,
  maxTrend?: number
): HypertrophyScoreResult {
  // Filter to working sets with hypertrophy factor > 0
  const workingSets = sets.filter(s => !isWarmupSet(s) && getWeeklyVolumeSetWeight(s) > 0);
  
  if (workingSets.length === 0) {
    return {
      totalScore: 0,
      volumeScore: 0,
      progressiveOverload: 0,
      frequency: 0,
      raw: { weeklySets: 0, avgOneRM: 0, oneRMTrend: 0, daysPerWeek: 0 },
    };
  }

  // Calculate 1RM for each set
  const setsWithOneRM: SetWithOneRM[] = workingSets.map(set => ({
    ...set,
    oneRM: calculateEpley1RM(set.weight_kg || 0, set.reps || 0),
  }));

  // Determine effective now: use provided date or latest date in sets
  let maxDate = effectiveNow ?? new Date(0);
  if (!effectiveNow) {
    for (const s of workingSets) {
      if (s.parsedDate && s.parsedDate > maxDate) maxDate = s.parsedDate;
    }
    if (maxDate.getTime() === 0) maxDate = new Date();
  }

  // --- Volume Score ---
  // Calculate rolling weekly average over last 4 weeks
  const now = maxDate;
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recentSets = setsWithOneRM.filter(s => s.parsedDate && s.parsedDate >= fourWeeksAgo);
  
  // Count unique training days for this muscle
  const trainingDays = new Set(recentSets.map(s => 
    s.parsedDate ? s.parsedDate.toDateString() : ''
  )).size;
  const daysPerWeek = trainingDays / 4;
  
  // Weekly sets (extrapolated from 4-week data, weighted by set type factor)
  const weeklySets = recentSets.reduce((sum, s) => sum + getWeeklyVolumeSetWeight(s), 0) / 4;
  const volumeScore = weeklyStimulusFromThresholds(weeklySets, getVolumeThresholds(trainingLevel));

  // --- Strength Base (removed as factor) ---
  const avgOneRM = setsWithOneRM.reduce((sum, s) => sum + s.oneRM, 0) / setsWithOneRM.length;

  // --- Progressive Overload ---
  // Per-exercise strength trend, weighted by set distribution for this muscle.
  // Each exercise is split at its own midpoint (halfway between earliest and latest
  // data date), ensuring both halves have data as long as the exercise spans ≥2 days.
  // Exercises with <2 sets in either half are skipped.

  // Group sets by exercise name
  const byExercise = new Map<string, typeof setsWithOneRM>();
  for (const s of setsWithOneRM) {
    const name = (s.exercise_title || '').toLowerCase().trim();
    if (!name) continue;
    const bucket = byExercise.get(name);
    if (bucket) bucket.push(s);
    else byExercise.set(name, [s]);
  }

  let totalExerciseSets = 0;
  let weightedTrend = 0;

  for (const [, exSets] of byExercise) {
    if (exSets.length < 4) continue;

    // Find this exercise's own date range
    const dates = exSets
      .map(s => s.parsedDate)
      .filter((d): d is Date => d != null)
      .map(d => d.getTime());
    if (dates.length < 4) continue;

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    if (maxDate - minDate < 2 * 24 * 60 * 60 * 1000) continue; // need ≥2 days

    const exMidpoint = new Date((minDate + maxDate) / 2);
    const older = exSets.filter(s => s.parsedDate && s.parsedDate < exMidpoint);
    const recent = exSets.filter(s => s.parsedDate && s.parsedDate >= exMidpoint);

    if (older.length < 2 || recent.length < 2) continue;

    const olderAvg = older.reduce((sum, s) => sum + s.oneRM, 0) / older.length;
    const recentAvg = recent.reduce((sum, s) => sum + s.oneRM, 0) / recent.length;
    if (olderAvg <= 0) continue;

    const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
    const exSetWeight = exSets.reduce((sum, s) => sum + getWeeklyVolumeSetWeight(s), 0);
    totalExerciseSets += exSetWeight;
    weightedTrend += trend * exSetWeight;
  }

  const oneRMTrend = totalExerciseSets > 0 ? weightedTrend / totalExerciseSets : 0;
  const progressiveOverload = calculateProgressiveOverloadScore(oneRMTrend, maxTrend ?? 0, 0, trainingLevel);

  // --- Frequency ---
  const frequency = calculateFrequencyScore(daysPerWeek, weeklySets, trainingLevel);

  // --- Total Score ---
  // Weights: Volume 50%, Progress 40%, Frequency 10%

  // Issue 1: skipped muscles (0 volume + 0 frequency) get total 0
  if (volumeScore <= 0 && frequency <= 0) {
    return {
      totalScore: 0,
      volumeScore: 0,
      progressiveOverload: 0,
      frequency: 0,
      raw: {
        weeklySets: Math.round(weeklySets * 10) / 10,
        avgOneRM: Math.round(avgOneRM * 10) / 10,
        oneRMTrend: Math.round(oneRMTrend * 10) / 10,
        daysPerWeek: Math.round(daysPerWeek * 10) / 10,
      },
    };
  }

  const totalScore = 
    volumeScore * FACTOR_WEIGHTS.volumeScore +
    progressiveOverload +
    frequency * FACTOR_WEIGHTS.frequency;

  return {
    totalScore: Math.round(totalScore),
    volumeScore: Math.round(volumeScore),
    progressiveOverload: Math.round(progressiveOverload),
    frequency: Math.round(frequency),
    raw: {
      weeklySets: Math.round(weeklySets * 10) / 10,
      avgOneRM: Math.round(avgOneRM * 10) / 10,
      oneRMTrend: Math.round(oneRMTrend * 10) / 10,
      daysPerWeek: Math.round(daysPerWeek * 10) / 10,
    },
  };
}

/**
 * Calculate hypertrophy scores for all muscles in dataset
 * @param useHeadlessMuscleIds - If true, uses the same muscle ID system as the
 *   lifetime achievement view (chest, biceps, triceps, etc.) instead of normalized
 *   muscle groups (Chest, Back, Arms, etc.)
 * @param effectiveNow - Reference date for window calculations. Defaults to the
 *   latest date found in the data (so stale CSV data scores correctly).
 * @param trendWindowDays - Days to look back for progressive overload trend.
 *   Default 28 (4wk). Use 14 for 7d filter, 56 for 30d, 730 for 365d.
 */
export function calculateAllMuscleHypertrophyScores(
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  trainingLevel: TrainingLevel = 'intermediate',
  useHeadlessMuscleIds = false,
  effectiveNow?: Date,
  trendWindowDays: number = 28
): MuscleHypertrophyData[] {
  const lowerMap = getLowerMap(assetsMap);
  
  // Compute effective now from data if not provided
  let computedNow = effectiveNow ?? new Date(0);
  if (!effectiveNow) {
    for (const s of data) {
      if (s.parsedDate && s.parsedDate > computedNow) computedNow = s.parsedDate;
    }
    if (computedNow.getTime() === 0) computedNow = new Date();
  }

  // Group sets by muscle
  const muscleSets = new Map<string, { name: string; sets: WorkoutSet[] }>();
  
  if (useHeadlessMuscleIds) {
    // Use the same CSV→SVG→MuscleId chain as the lifetime achievement view
    for (const set of data) {
      if (isWarmupSet(set) || getWeeklyVolumeSetWeight(set) <= 0) continue;
      if (!set.parsedDate) continue;
      
      const name = set.exercise_title || '';
      const asset = lookupAsset(name, assetsMap, lowerMap);
      if (!asset) continue;
      
      const primaries = String(asset.primary_muscle ?? '').split(',').map(s => s.trim()).filter(Boolean);
      
      // Handle empty primary + non-empty secondary (treat first secondary as primary)
      let primaryMuscles = primaries;
      if (primaryMuscles.length === 0) {
        const secondaries = String(asset.secondary_muscle ?? '').split(',').map(s => s.trim()).filter(Boolean);
        if (secondaries.length > 0) {
          primaryMuscles = [secondaries[0]];
        }
      }
      
      const addedMuscles = new Set<string>();
      
      for (const raw of primaryMuscles) {
        if (/^(cardio|none|other|full[\s-]*body)$/i.test(raw)) continue;
        const muscleIds = getMuscleIdsFromRawName(raw);
        for (const mId of muscleIds) {
          if (addedMuscles.has(mId)) continue;
          addedMuscles.add(mId);
          const displayName = MUSCLE_NAMES[mId] ?? mId.charAt(0).toUpperCase() + mId.slice(1);
          const existing = muscleSets.get(mId);
          if (existing) {
            existing.sets.push(set);
          } else {
            muscleSets.set(mId, { name: displayName, sets: [set] });
          }
        }
      }
    }
  } else {
    // Original behavior: normalize to major groups (Chest, Back, Arms, etc.)
    for (const set of data) {
      if (isWarmupSet(set) || getWeeklyVolumeSetWeight(set) <= 0) continue;
      if (!set.parsedDate) continue;
      
      const name = set.exercise_title || '';
      const asset = lookupAsset(name, assetsMap, lowerMap);
      if (!asset) continue;
      
      const contributions = getMuscleContributionsFromAsset(asset, true);
      for (const contrib of contributions) {
        const existing = muscleSets.get(contrib.muscle);
        if (existing) {
          existing.sets.push(set);
        } else {
          muscleSets.set(contrib.muscle, { name: contrib.muscle, sets: [set] });
        }
      }
    }
  }
  
  // Calculate score for each muscle (first pass: get raw trends)
  const results: MuscleHypertrophyData[] = [];
  for (const [muscleId, { name, sets }] of muscleSets) {
    const score = calculateMuscleHypertrophyScore(
      muscleId,
      name,
      sets,
      assetsMap,
      trainingLevel,
      computedNow,
      trendWindowDays
    );
    results.push({ muscleId, muscleName: name, score });
  }

  // Second pass: relative progressive overload scoring
  const allTrends = results.map(r => r.score.raw.oneRMTrend);
  const maxTrend = Math.max(0, ...allTrends);
  const minTrend = Math.min(0, ...allTrends);

  for (const r of results) {
    const trend = r.score.raw.oneRMTrend;
    r.score.progressiveOverload = calculateProgressiveOverloadScore(trend, maxTrend, minTrend, trainingLevel);
    if (r.score.volumeScore > 0 || r.score.frequency > 0) {
        r.score.totalScore = Math.round(
          r.score.volumeScore * FACTOR_WEIGHTS.volumeScore +
          r.score.progressiveOverload +
          r.score.frequency * FACTOR_WEIGHTS.frequency
        );
      }
    }
  
  // Sort by total score descending
  return results.sort((a, b) => b.score.totalScore - a.score.totalScore);
}

/**
 * Compute hypertrophy scores using existing exercise trend analysis for progress.
 *
 * @param exerciseStats — all exercise stats (pre-computed elsewhere)
 * @param headlessRatesMap — per-muscle weekly set rates (computed with secondarySetMultiplier)
 * @param parsedData — full raw workout data (for frequency + progress)
 * @param period — '7d' (uses recentDeltaPct) or '30d' (uses diffPct)
 * @param effectiveNow — reference date for window calculation
 * @param windowStart — start of the filter window
 */
export function calculateHypertrophyScoresWithExerciseTrends(
  exerciseStats: ExerciseStats[],
  headlessRatesMap: Map<string, number> | null,
  assetsMap: Map<string, ExerciseAsset>,
  trainingLevel: TrainingLevel,
  period: '7d' | '30d',
  effectiveNow: Date,
  parsedData: WorkoutSet[],
  windowStart: Date,
  exerciseTrendResults?: Map<string, ExerciseTrendCoreResult>
): MuscleHypertrophyData[] {
  const lowerMap = getLowerMap(assetsMap);
  const windowDays = period === '7d' ? 7 : 30;
  const weeks = windowDays / 7;
  const windowEnd = effectiveNow; // upper bound

  // Build exercise → muscles mapping (from window-filtered data)
  const exerciseToMuscles = new Map<string, Set<string>>();
  const inWindow = (s: WorkoutSet) =>
    s.parsedDate && s.parsedDate >= windowStart && s.parsedDate <= windowEnd;
  const setToAllMuscles = (raw: string, target: Set<string>) => {
    if (/^(cardio|none|other|full[\s-]*body)$/i.test(raw)) return;
    const ids = getMuscleIdsFromRawName(raw);
    for (const mId of ids) target.add(mId);
  };

  for (const set of parsedData) {
    if (isWarmupSet(set) || getWeeklyVolumeSetWeight(set) <= 0) continue;
    if (!inWindow(set)) continue;
    const name = (set.exercise_title || '').toLowerCase().trim();
    if (exerciseToMuscles.has(name)) continue;

    const asset = lookupAsset(set.exercise_title || '', assetsMap, lowerMap);
    if (!asset) continue;

    const ids = new Set<string>();
    const primaries = String(asset.primary_muscle ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const secondaries = String(asset.secondary_muscle ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (primaries.length === 0 && secondaries.length > 0) primaries.push(secondaries[0]);

    for (const raw of primaries) setToAllMuscles(raw, ids);
    for (const raw of secondaries) setToAllMuscles(raw, ids);

    if (ids.size > 0) exerciseToMuscles.set(name, ids);
  }

  // Frequency + set counting: count sets per (muscle, date) and per (muscle, exercise)
  const muscleDaySets = new Map<string, Map<string, number>>();
  const muscleExerciseSets = new Map<string, Map<string, number>>(); // muscleId -> (exerciseName -> setCount)
  const muscleTotalSets = new Map<string, number>(); // muscleId -> total set count
  for (const set of parsedData) {
    const setFactor = getWeeklyVolumeSetWeight(set);
    if (isWarmupSet(set) || setFactor <= 0) continue;
    if (!inWindow(set)) continue;
    const name = (set.exercise_title || '').toLowerCase().trim();
    const muscleIds = exerciseToMuscles.get(name);
    if (!muscleIds) continue;
    const dateStr = set.parsedDate!.toISOString().slice(0, 10);
    for (const mId of muscleIds) {
      let dayMap = muscleDaySets.get(mId);
      if (!dayMap) { dayMap = new Map(); muscleDaySets.set(mId, dayMap); }
      dayMap.set(dateStr, (dayMap.get(dateStr) ?? 0) + setFactor);

      let exMap = muscleExerciseSets.get(mId);
      if (!exMap) { exMap = new Map(); muscleExerciseSets.set(mId, exMap); }
      exMap.set(name, (exMap.get(name) ?? 0) + setFactor);

      muscleTotalSets.set(mId, (muscleTotalSets.get(mId) ?? 0) + setFactor);
    }
  }

  // Count valid frequency days (≥1 set per day)
  const muscleDays = new Map<string, number>();
  for (const [mId, dayMap] of muscleDaySets) {
    muscleDays.set(mId, dayMap.size);
  }

  // Progress: weighted average of per-exercise trend % by set proportion
  // Each exercise's trend is multiplied by its share of total sets for that muscle,
  // giving more weight to exercises that dominate the muscle's training volume.
  const muscleProgressRaw = new Map<string, number>();
  const muscleProgressWeight = new Map<string, number>();

  for (const stat of exerciseStats) {
    const nameLower = stat.name.toLowerCase().trim();
    const muscleIds = exerciseToMuscles.get(nameLower);
    if (!muscleIds || muscleIds.size === 0) continue;

    const trendResult = exerciseTrendResults?.get(stat.name) ?? analyzeExerciseTrendCore(stat, { trendMode: 'reactive' });
    const pct = period === '7d'
      ? (trendResult.calculation?.recentDeltaPct ?? null)
      : (trendResult.diffPct ?? null);
    if (pct === null || pct === undefined) continue;

    for (const muscleId of muscleIds) {
      const totalSets = muscleTotalSets.get(muscleId) ?? 0;
      if (totalSets <= 0) continue;
      const exMap = muscleExerciseSets.get(muscleId);
      const exerciseSets = exMap?.get(nameLower) ?? 0;
      const weight = exerciseSets / totalSets;

      const prev = muscleProgressRaw.get(muscleId) ?? 0;
      muscleProgressRaw.set(muscleId, prev + pct * weight);
      muscleProgressWeight.set(muscleId, (muscleProgressWeight.get(muscleId) ?? 0) + weight);
    }
  }

  // Compute min/max progress from QUALIFIED muscles only (≥4 weekly sets)
  // Low-volume muscles are excluded from scale but still scored against it
  const MIN_WEEKLY_SETS = 4;
  const PROGRESS_DEFAULTS_BY_LEVEL: Record<TrainingLevel, { max: number; min: number }> = {
    beginner:     { max: 12, min: -1 },
    intermediate: { max:  7, min: -3 },
    advanced:     { max:  5, min: -2 },
  };
  const defaults = PROGRESS_DEFAULTS_BY_LEVEL[trainingLevel] ?? PROGRESS_DEFAULTS_BY_LEVEL.intermediate;
  const DEFAULT_MAX_PROGRESS = defaults.max;
  const DEFAULT_MIN_PROGRESS = defaults.min;

  let maxProgress = DEFAULT_MAX_PROGRESS;
  let minProgress = DEFAULT_MIN_PROGRESS;
  let foundQualified = false;

  for (const [muscleId] of muscleProgressRaw) {
    const w = muscleProgressWeight.get(muscleId) ?? 0;
    const avgTrend = w > 0 ? muscleProgressRaw.get(muscleId)! / w : 0;
    const weeklySets = headlessRatesMap?.get(muscleId) ?? 0;
    if (weeklySets >= MIN_WEEKLY_SETS) {
      if (!foundQualified) {
        maxProgress = avgTrend;
        minProgress = avgTrend;
        foundQualified = true;
      } else {
        if (avgTrend > maxProgress) maxProgress = avgTrend;
        if (avgTrend < minProgress) minProgress = avgTrend;
      }
    }
  }
  // Clamp: max at least DEFAULT_MAX, min at most DEFAULT_MIN (prevent extreme outliers)
  // Upper: if no qualified muscle reaches 10%, use 10% as ceiling
  // Lower: if no qualified muscle goes below -5%, use -5% as floor
  if (maxProgress < DEFAULT_MAX_PROGRESS) maxProgress = DEFAULT_MAX_PROGRESS;
  if (minProgress > DEFAULT_MIN_PROGRESS) minProgress = DEFAULT_MIN_PROGRESS;

  // Build results — iterate headlessRatesMap for volume
  const results: MuscleHypertrophyData[] = [];
  for (const [muscleId, rate] of headlessRatesMap ?? new Map()) {
    if (rate <= 0) continue;

    const volumeScore = Math.round(weeklyStimulusFromThresholds(rate, getVolumeThresholds(trainingLevel)));
    const weeklySets = Math.round(rate * 10) / 10;

    const daysInWindow = muscleDays.get(muscleId) ?? 0;
    const daysPerWeek = daysInWindow / weeks;
    const frequency = calculateFrequencyScore(daysPerWeek, rate, trainingLevel);

    if (volumeScore <= 0 && frequency <= 0) continue;

    const rawProgress = muscleProgressRaw.get(muscleId) ?? 0;
    const progressWeight = muscleProgressWeight.get(muscleId) ?? 0;
    const oneRMTrend = progressWeight > 0 ? rawProgress / progressWeight : 0;
    const progressiveOverload = calculateProgressiveOverloadScore(oneRMTrend, maxProgress, minProgress, trainingLevel);

    const totalScore = Math.round(
      volumeScore * FACTOR_WEIGHTS.volumeScore +
      progressiveOverload +
      frequency * FACTOR_WEIGHTS.frequency
    );

    results.push({
      muscleId,
      muscleName: MUSCLE_NAMES[muscleId as MuscleId] ?? muscleId.charAt(0).toUpperCase() + muscleId.slice(1),
      score: {
        totalScore,
        volumeScore,
        progressiveOverload,
        frequency: Math.round(frequency),
        raw: { weeklySets, avgOneRM: 0, oneRMTrend: Math.round(oneRMTrend * 10) / 10, daysPerWeek: Math.round(daysPerWeek * 10) / 10 },
      },
    });
  }

  return results.sort((a, b) => b.score.totalScore - a.score.totalScore);
}

/**
 * Get score rating label
 */
export function getScoreRating(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Optimal', color: '#22c55e' };
  if (score >= 60) return { label: 'Good', color: '#84cc16' };
  if (score >= 40) return { label: 'Moderate', color: '#f59e0b' };
  if (score >= 20) return { label: 'Low', color: '#f97316' };
  return { label: 'Minimal', color: '#ef4444' };
}
