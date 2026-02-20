import { useMemo } from 'react';
import { differenceInMonths } from 'date-fns';
import type { WorkoutSet } from '../../types';
import { isWarmupSet } from '../../utils/analysis/classification';
import { isUnilateralSet } from '../../utils/analysis/classification/setClassification';
import { calculateUnifiedScore, findCurrentCheckpointIndexByScore, CHECKPOINTS } from '../../utils/training/trainingTimeline';
import type { TrainingLevel } from '../../utils/muscle/hypertrophy/muscleParams';

interface UseTrainingLevelResult {
  /** User's training level based on data history (sets + months) */
  trainingLevel: TrainingLevel;
  /** Months of training history found in data */
  monthsTraining: number;
  /** Total lifetime sets */
  totalSets: number;
  /** Earliest workout date in the dataset */
  earliestDate: Date | null;
}

/**
 * Calculate user's training level from their workout history.
 * This provides personalized volume thresholds based on training experience.
 * 
 * Uses a sets-based approach:
 * - Total sets = primary driver (measures actual work done)
 * - Months = secondary minimum (prevents speed-running)
 * 
 * The checkpoint system handles the progression:
 * - Beginner: Seedling → Sprout → Sapling
 * - Intermediate: Foundation → Builder → Sculptor
 * - Advanced: Elite → Master → Legend
 * 
 * Volume thresholds by level:
 * - beginner: { mv: 4, mev: 8, mrv: 14, maxv: 18 }
 * - intermediate: { mv: 6, mev: 12, mrv: 21, maxv: 25 }
 * - advanced: { mv: 8, mev: 16, mrv: 26, maxv: 33 }
 */
export const useTrainingLevel = (
  data: WorkoutSet[],
  effectiveNow?: Date
): UseTrainingLevelResult => {
  return useMemo(() => {
    if (!data || data.length === 0) {
      return {
        trainingLevel: 'beginner',
        monthsTraining: 0,
        totalSets: 0,
        earliestDate: null,
      };
    }

    // Count total sets and find earliest date
    let totalSets = 0;
    let earliestDate: Date | null = null;

    for (const set of data) {
      if (isWarmupSet(set)) continue;

      const date = set.parsedDate;
      if (!date) continue;

      if (!earliestDate || date < earliestDate) {
        earliestDate = date;
      }

      // Count sets (0.5 for unilateral, 1 for bilateral)
      totalSets += isUnilateralSet(set) ? 0.5 : 1;
    }

    if (!earliestDate) {
      return {
        trainingLevel: 'beginner',
        monthsTraining: 0,
        totalSets: 0,
        earliestDate: null,
      };
    }

    const referenceNow = effectiveNow ?? new Date();
    const monthsTraining = differenceInMonths(referenceNow, earliestDate);

    // Use checkpoint index to determine training level
    const unifiedScore = calculateUnifiedScore(totalSets, monthsTraining);
    const checkpointIndex = findCurrentCheckpointIndexByScore(unifiedScore);
    const currentCheckpoint = CHECKPOINTS[checkpointIndex];
    const trainingLevel = currentCheckpoint.phase;

    return {
      trainingLevel,
      monthsTraining,
      totalSets,
      earliestDate,
    };
  }, [data, effectiveNow]);
};

export type { TrainingLevel };
