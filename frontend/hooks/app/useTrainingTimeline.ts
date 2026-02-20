import { useMemo } from 'react';
import { differenceInMonths, differenceInCalendarWeeks, subWeeks } from 'date-fns';
import type { WorkoutSet } from '../../types';
import { isWarmupSet } from '../../utils/analysis/classification';
import { isUnilateralSet } from '../../utils/analysis/classification/setClassification';
import {
  computeTimelineProgress,
  type TimelineProgress,
} from '../../utils/training/trainingTimeline';

/**
 * Compute the user's position on the training timeline using a unified score system.
 *
 * - Total sets = primary driver (measures actual work done)
 * - Months = time from first workout to latest workout (effective date)
 * - Recent sets per week = for pace estimation
 *
 * Returns the full TimelineProgress snapshot.
 */
export const useTrainingTimeline = (
  data: WorkoutSet[],
  effectiveNow?: Date,
): TimelineProgress => {
  return useMemo(() => {
    if (!data || data.length === 0) {
      return computeTimelineProgress(0, 0, null);
    }

    // Count total sets (excluding warmups)
    // Unilateral sets (left/right) count as 0.5
    let totalSets = 0;
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    for (const s of data) {
      if (isWarmupSet(s)) continue;

      const d = s.parsedDate;
      if (!d) continue;

      // Track earliest and latest dates
      if (!earliestDate || d < earliestDate) {
        earliestDate = d;
      }
      if (!latestDate || d > latestDate) {
        latestDate = d;
      }

      // Count sets (0.5 for unilateral, 1 for bilateral)
      const setCount = isUnilateralSet(s) ? 0.5 : 1;
      totalSets += setCount;
    }

    if (!earliestDate || !latestDate) {
      return computeTimelineProgress(0, 0, null);
    }

    // Months = time from first workout to latest workout (not current date)
    const monthsTraining = differenceInMonths(latestDate, earliestDate);
    const weeksTraining = differenceInCalendarWeeks(latestDate, earliestDate) || 1;

    // Recent sets per week calculation
    const recentSetsCutoff = subWeeks(latestDate, 4);
    let recentSets = 0;
    for (const s of data) {
      if (isWarmupSet(s)) continue;
      const d = s.parsedDate;
      if (!d || d < recentSetsCutoff) continue;
      recentSets += isUnilateralSet(s) ? 0.5 : 1;
    }

    // Sets per week (overall average)
    const setsPerWeek = totalSets / weeksTraining;

    // Recent sets per week (for pace estimation)
    const recentSetsPerWeek = recentSets / 4;

    // Use recent pace for better ETA estimates
    const paceForEta = recentSets > 0 ? recentSetsPerWeek : setsPerWeek;

    return computeTimelineProgress(totalSets, monthsTraining, paceForEta);
  }, [data, effectiveNow]);
};
