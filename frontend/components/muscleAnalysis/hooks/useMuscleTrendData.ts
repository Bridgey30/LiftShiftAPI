import { useMemo } from 'react';
import { differenceInCalendarDays, differenceInMonths } from 'date-fns';
import type { WorkoutSet } from '../../../types';
import { computeWeeklySetsDelta } from '../utils/weeklySetsMetrics';
import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import { computeDailySvgMuscleVolumes, computeWindowedExerciseBreakdown } from '../../../utils/muscle/volume';
import { HEADLESS_ID_TO_DETAILED_SVG_IDS, HEADLESS_MUSCLE_IDS } from '../../../utils/muscle/mapping';
import { isWarmupSet } from '../../../utils/analysis/classification';
import type { NormalizedMuscleGroup } from '../../../utils/muscle/analytics';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { computationCache } from '../../../utils/storage/computationCache';
import { muscleCacheKeys } from '../../../utils/storage/cacheKeys';
import { getTrainingLevel, getVolumeThresholds, type TrainingLevel } from '../../../utils/muscle/hypertrophy/muscleParams';

interface UseMuscleTrendDataParams {
  data: WorkoutSet[];
  assetsMap: Map<string, ExerciseAsset> | null;
  windowStart: Date | null;
  effectiveNow: Date;
  allTimeWindowStart: Date | null;
  weeklySetsWindow: WeeklySetsWindow;
  selectedSubjectKeys: string[];
  groupWeeklyRatesBySubject: Map<string, number> | null;
  headlessRatesMap: Map<string, number>;
  muscleVolume: Map<string, { sets: number }>;
  windowedGroupVolumes: Map<NormalizedMuscleGroup, number>;
  muscleVolumes: Map<string, number>;
  filterCacheKey: string;
}

export const useMuscleTrendData = ({
  data,
  assetsMap,
  windowStart,
  effectiveNow,
  allTimeWindowStart,
  weeklySetsWindow,
  selectedSubjectKeys,
  headlessRatesMap,
  muscleVolumes,
  filterCacheKey,
}: UseMuscleTrendDataParams) => {
  // Compute user's training level from data
  const trainingLevel = useMemo(() => {
    if (!data || data.length === 0) return 'beginner' as TrainingLevel;
    
    // Find earliest workout date
    let earliestDate: Date | null = null;
    for (const set of data) {
      const date = new Date(set.start_time);
      if (!earliestDate || date < earliestDate) {
        earliestDate = date;
      }
    }
    
    if (!earliestDate) return 'beginner' as TrainingLevel;
    
    const monthsTraining = differenceInMonths(new Date(), earliestDate);
    return getTrainingLevel(monthsTraining);
  }, [data]);

  // Get volume thresholds based on training level
  const volumeThresholds = useMemo(() => {
    return getVolumeThresholds(trainingLevel);
  }, [trainingLevel]);

  // For legend: Get MAX weekly sets across all muscles (for this filter)
  const legendMaxSets = useMemo(() => {
    let max = 0;
    for (const v of headlessRatesMap.values()) {
      if (v > max) max = v;
    }
    return Math.round(max * 10) / 10;
  }, [headlessRatesMap]);

  // Derive weekly sets summary from headlessRatesMap (single source of truth)
  // This ensures consistency with body map hover values
  const weeklySetsSummary = useMemo(() => {
    if (selectedSubjectKeys.length > 0) {
      // Sum up the selected muscle(s) values
      let sum = 0;
      for (const k of selectedSubjectKeys) {
        sum += headlessRatesMap.get(k) ?? 0;
      }
      return Math.round(sum * 10) / 10;
    }
    
    // When no muscle is selected, return average sets per muscle
    if (headlessRatesMap.size === 0) return 0;
    let sum = 0;
    let count = 0;
    for (const v of headlessRatesMap.values()) {
      sum += v;
      count++;
    }
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  }, [headlessRatesMap, selectedSubjectKeys]);

  const weeklySetsDelta = useMemo(() => {
    return computeWeeklySetsDelta({
      assetsMap,
      windowStart,
      weeklySetsWindow,
      selectedSubjectKeys,
      data,
      effectiveNow,
      allTimeWindowStart,
    });
  }, [assetsMap, windowStart, weeklySetsWindow, selectedSubjectKeys, data, effectiveNow, allTimeWindowStart]);

  const trendData = useMemo(() => {
    if (!assetsMap || data.length === 0 || !windowStart) return [];

    // Create a hash of selected keys for cache key
    const selectedKeysHash = selectedSubjectKeys.sort().join(',') || 'all';
    const cacheKey = muscleCacheKeys.trendData(filterCacheKey, weeklySetsWindow, 'headless', selectedKeysHash);

    return computationCache.getOrCompute(
      cacheKey,
      data,
      () => {
        // Get daily volumes
        const dailyVolumes = computeDailySvgMuscleVolumes(data, assetsMap);

        // Filter to window and calculate cumulative averages
        const windowedDaily = dailyVolumes.filter(d => d.date >= windowStart && d.date <= effectiveNow);
        if (windowedDaily.length === 0) return [];

        const keys = selectedSubjectKeys;

        // Helper to get sum for a day
        const getDaySum = (day: { muscles: ReadonlyMap<string, number> }) => {
          // For headless mode, aggregate detailed SVG parts to headless muscles using MAX
          const headlessTotals = new Map<string, number>();
          for (const [k, v] of day.muscles.entries()) {
            // Find which headless muscle this SVG id belongs to
            for (const [headlessId, detailedIds] of Object.entries(HEADLESS_ID_TO_DETAILED_SVG_IDS)) {
              if ((detailedIds as readonly string[]).includes(k)) {
                const current = headlessTotals.get(headlessId) ?? 0;
                if (v > current) headlessTotals.set(headlessId, v);
                break;
              }
            }
          }
          
          if (keys.length > 0) {
            let sum = 0;
            for (const k of keys) sum += headlessTotals.get(k) ?? 0;
            return sum;
          }
          
          // When no muscle is selected, return average per muscle
          let sum = 0;
          for (const v of headlessTotals.values()) sum += v;
          return sum / HEADLESS_MUSCLE_IDS.length;
        };

        // Build data points showing cumulative average weekly rate at each training day
        const result: Array<{ period: string; timestamp: number; sets: number }> = [];
        let cumulativeTotal = 0;
        
        for (const day of windowedDaily) {
          cumulativeTotal += getDaySum(day);
          const daysSinceStart = Math.max(1, differenceInCalendarDays(day.date, windowStart) + 1);
          const weeks = Math.max(1, daysSinceStart / 7);
          const avgWeeklyRate = Math.round((cumulativeTotal / weeks) * 10) / 10;
          
          result.push({
            period: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            timestamp: day.date.getTime(),
            sets: avgWeeklyRate,
          });
        }

        return result;
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [assetsMap, data, windowStart, effectiveNow, weeklySetsWindow, selectedSubjectKeys, filterCacheKey]);

  // Compute legend trend data - based on MAX muscle (to show overdrive if any muscle is in overdrive)
  const legendTrendData = useMemo(() => {
    if (!assetsMap || data.length === 0 || !windowStart) return [];

    const cacheKey = muscleCacheKeys.trendData(filterCacheKey, weeklySetsWindow, 'headless', 'all');

    return computationCache.getOrCompute(
      cacheKey,
      data,
      () => {
        const dailyVolumes = computeDailySvgMuscleVolumes(data, assetsMap);
        const windowedDaily = dailyVolumes.filter(d => d.date >= windowStart && d.date <= effectiveNow);
        if (windowedDaily.length === 0) return [];

        const getDayMax = (day: { muscles: ReadonlyMap<string, number> }) => {
          const headlessTotals = new Map<string, number>();
          for (const [k, v] of day.muscles.entries()) {
            for (const [headlessId, detailedIds] of Object.entries(HEADLESS_ID_TO_DETAILED_SVG_IDS)) {
              if ((detailedIds as readonly string[]).includes(k)) {
                const current = headlessTotals.get(headlessId) ?? 0;
                if (v > current) headlessTotals.set(headlessId, v);
                break;
              }
            }
          }
          let max = 0;
          for (const v of headlessTotals.values()) {
            if (v > max) max = v;
          }
          return max;
        };

        const result: Array<{ period: string; timestamp: number; sets: number }> = [];
        
        for (const day of windowedDaily) {
          const maxSets = getDayMax(day);
          result.push({
            period: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            timestamp: day.date.getTime(),
            sets: Math.round(maxSets * 10) / 10,
          });
        }

        return result;
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [assetsMap, data, windowStart, effectiveNow, weeklySetsWindow, filterCacheKey]);

  const windowedSelectionBreakdown = useMemo(() => {
    if (!assetsMap || !windowStart) return null;

    const selectedKeysHash = selectedSubjectKeys.sort().join(',') || 'all';
    const cacheKey = muscleCacheKeys.exerciseBreakdown(
      filterCacheKey,
      windowStart.getTime(),
      'headless',
      selectedKeysHash
    );

    return computationCache.getOrCompute(
      cacheKey,
      data,
      () => {
        const selectedForBreakdown = selectedSubjectKeys.flatMap((h) => (HEADLESS_ID_TO_DETAILED_SVG_IDS as any)[h] ?? []);

        return computeWindowedExerciseBreakdown({
          data,
          assetsMap,
          start: windowStart,
          end: effectiveNow,
          grouping: 'muscles',
          selectedSubjects: selectedForBreakdown,
        });
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [assetsMap, windowStart, effectiveNow, selectedSubjectKeys, data, filterCacheKey]);

  const contributingExercises = useMemo(() => {
    if (!windowedSelectionBreakdown) return [];
    const exercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number }> = [];
    windowedSelectionBreakdown.exercises.forEach((exData, name) => {
      exercises.push({ name, ...exData });
    });
    return exercises.sort((a, b) => b.sets - a.sets);
  }, [windowedSelectionBreakdown]);

  const totalSets = useMemo(() => {
    return data.reduce((acc, s) => (isWarmupSet(s) ? acc : acc + 1), 0);
  }, [data]);

  const musclesWorked = useMemo(() => {
    let count = 0;
    muscleVolumes.forEach(() => count++);
    return count;
  }, [muscleVolumes]);

  return {
    weeklySetsSummary,
    legendMaxSets,
    trainingLevel,
    volumeThresholds,
    weeklySetsDelta,
    trendData,
    legendTrendData,
    windowedSelectionBreakdown,
    contributingExercises,
    totalSets,
    musclesWorked,
  };
};
