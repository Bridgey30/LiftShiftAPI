import { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import type { WorkoutSet, ExerciseStats } from '../../../types';
import { computeWeeklySetsDelta } from '../utils/weeklySetsMetrics';
import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import { computeDailySvgMuscleVolumes, computeWindowedExerciseBreakdown } from '../../../utils/muscle/volume';
import { MUSCLE_ID_TO_DETAILED_SVG_IDS, MUSCLE_IDS } from '../../../utils/muscle/mapping';
import { getWeeklyVolumeSetWeight } from '../../../utils/analysis/classification';
import type { NormalizedMuscleGroup } from '../../../utils/muscle/analytics';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { computationCache } from '../../../utils/storage/computationCache';
import { muscleCacheKeys } from '../../../utils/storage/cacheKeys';
import { getVolumeThresholds, type TrainingLevel } from '../../../utils/muscle/hypertrophy/muscleParams';
import { useTrainingLevel } from '../../../hooks/app/useTrainingLevel';
import { analyzeExerciseTrendCore } from '../../../utils/analysis/exerciseTrend';

interface UseMuscleTrendDataParams {
  data: WorkoutSet[];
  assetsMap: Map<string, ExerciseAsset> | null;
  windowStart: Date | null;
  breakdownStart: Date | null;
  effectiveNow: Date;
  allTimeWindowStart: Date | null;
  weeklySetsWindow: WeeklySetsWindow;
  selectedSubjectKeys: string[];
  groupWeeklyRatesBySubject: Map<string, number> | null;
  muscleRatesMap: Map<string, number>;
  muscleVolume: Map<string, { sets: number }>;
  windowedGroupVolumes: Map<NormalizedMuscleGroup, number>;
  muscleVolumes: Map<string, number>;
  filterCacheKey: string;
  secondarySetMultiplier: number;
  exerciseStats?: ExerciseStats[];
}

export const useMuscleTrendData = ({
  data,
  assetsMap,
  windowStart,
  breakdownStart,
  effectiveNow,
  allTimeWindowStart,
  weeklySetsWindow,
  selectedSubjectKeys,
  groupWeeklyRatesBySubject,
  muscleRatesMap,
  muscleVolumes,
  filterCacheKey,
  secondarySetMultiplier,
  exerciseStats,
}: UseMuscleTrendDataParams) => {
  // Use shared hook for training level calculation (matches Dashboard)
  const { trainingLevel } = useTrainingLevel(data, effectiveNow);

  // Get volume thresholds based on training level
  const volumeThresholds = useMemo(() => {
    return getVolumeThresholds(trainingLevel);
  }, [trainingLevel]);

  // For legend: Get MAX weekly sets across all muscles (for this filter)
  const legendMaxSets = useMemo(() => {
    let max = 0;
    for (const v of muscleRatesMap.values()) {
      if (v > max) max = v;
    }
    return Math.round(max * 10) / 10;
  }, [muscleRatesMap]);

  // Derive weekly sets summary from muscleRatesMap (single source of truth)
  // This ensures consistency with body map hover values
  const weeklySetsSummary = useMemo(() => {
    if (selectedSubjectKeys.length > 0) {
      // Sum up the selected muscle(s) values
      let sum = 0;
      for (const k of selectedSubjectKeys) {
        sum += muscleRatesMap.get(k) ?? 0;
      }
      return Math.round(sum * 10) / 10;
    }
    
    // When no muscle is selected, return average sets per muscle
    if (muscleRatesMap.size === 0) return 0;
    let sum = 0;
    let count = 0;
    for (const v of muscleRatesMap.values()) {
      sum += v;
      count++;
    }
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  }, [muscleRatesMap, selectedSubjectKeys]);

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
    const cacheKey = muscleCacheKeys.trendDataWithMultiplier(
      filterCacheKey,
      weeklySetsWindow,
      'muscle',
      selectedKeysHash,
      secondarySetMultiplier
    );

    return computationCache.getOrCompute(
      cacheKey,
      data,
      () => {
        // Get daily volumes
        const dailyVolumes = computeDailySvgMuscleVolumes(data, assetsMap, secondarySetMultiplier);

        // Filter to window and calculate cumulative averages
        const windowedDaily = dailyVolumes.filter(d => d.date >= windowStart && d.date <= effectiveNow);
        if (windowedDaily.length === 0) return [];

        const keys = selectedSubjectKeys;

        // Helper to get sum for a day
        const getDaySum = (day: { muscles: ReadonlyMap<string, number> }) => {
          // For muscle mode, aggregate detailed SVG parts into muscle IDs using MAX
          const muscleTotals = new Map<string, number>();
          for (const [k, v] of day.muscles.entries()) {
            // Find which muscle this SVG id belongs to
            for (const [muscleId, detailedIds] of Object.entries(MUSCLE_ID_TO_DETAILED_SVG_IDS)) {
              if ((detailedIds as readonly string[]).includes(k)) {
                const current = muscleTotals.get(muscleId) ?? 0;
                if (v > current) muscleTotals.set(muscleId, v);
                break;
              }
            }
          }
          
          if (keys.length > 0) {
            let sum = 0;
            for (const k of keys) sum += muscleTotals.get(k) ?? 0;
            return sum;
          }
          
          // When no muscle is selected, return average per muscle
          let sum = 0;
          for (const v of muscleTotals.values()) sum += v;
          return sum / MUSCLE_IDS.length;
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
  }, [assetsMap, data, windowStart, effectiveNow, weeklySetsWindow, selectedSubjectKeys, filterCacheKey, secondarySetMultiplier]);

  // Compute legend trend data - based on MAX muscle (to show overdrive if any muscle is in overdrive)
  const legendTrendData = useMemo(() => {
    if (!assetsMap || data.length === 0 || !windowStart) return [];

    const cacheKey = muscleCacheKeys.trendDataWithMultiplier(
      filterCacheKey,
      weeklySetsWindow,
      'muscle',
      'all',
      secondarySetMultiplier
    );

    return computationCache.getOrCompute(
      cacheKey,
      data,
      () => {
        const dailyVolumes = computeDailySvgMuscleVolumes(data, assetsMap, secondarySetMultiplier);
        const windowedDaily = dailyVolumes.filter(d => d.date >= windowStart && d.date <= effectiveNow);
        if (windowedDaily.length === 0) return [];

        const getDayMax = (day: { muscles: ReadonlyMap<string, number> }) => {
          const muscleTotals = new Map<string, number>();
          for (const [k, v] of day.muscles.entries()) {
            for (const [muscleId, detailedIds] of Object.entries(MUSCLE_ID_TO_DETAILED_SVG_IDS)) {
              if ((detailedIds as readonly string[]).includes(k)) {
                const current = muscleTotals.get(muscleId) ?? 0;
                if (v > current) muscleTotals.set(muscleId, v);
                break;
              }
            }
          }
          let max = 0;
          for (const v of muscleTotals.values()) {
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
  }, [assetsMap, data, windowStart, effectiveNow, weeklySetsWindow, filterCacheKey, secondarySetMultiplier]);

  const windowedSelectionBreakdown = useMemo(() => {
    if (!assetsMap || !breakdownStart) return null;

    const selectedKeysHash = selectedSubjectKeys.sort().join(',') || 'all';
    const cacheKey = muscleCacheKeys.exerciseBreakdownWithMultiplier(
      filterCacheKey,
      breakdownStart.getTime(),
      'muscle',
      selectedKeysHash,
      secondarySetMultiplier
    );

    return computationCache.getOrCompute(
      cacheKey,
      data,
      () => {
        const selectedForBreakdown = selectedSubjectKeys.flatMap((h) => (MUSCLE_ID_TO_DETAILED_SVG_IDS as any)[h] ?? []);

        return computeWindowedExerciseBreakdown({
          data,
          assetsMap,
          start: breakdownStart,
          end: effectiveNow,
          grouping: 'muscles',
          selectedSubjects: selectedForBreakdown,
          secondarySetMultiplier,
        });
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [assetsMap, breakdownStart, effectiveNow, selectedSubjectKeys, data, filterCacheKey, secondarySetMultiplier]);

  const contributingExercises = useMemo(() => {
    if (!windowedSelectionBreakdown) return [];
    
    const calculateExerciseStrengthTrend = (exerciseName: string): { diffPct: number | null; label: string | null } | null => {
      const stats = exerciseStats?.find(s => s.name === exerciseName);
      if (!stats) return null;
      const trendResult = analyzeExerciseTrendCore(stats, { trendMode: 'reactive' });
      if (trendResult.diffPct === null || trendResult.diffPct === undefined) return { diffPct: null, label: null };
      const prefix = trendResult.diffPct > 0 ? '+' : '';
      return { 
        diffPct: trendResult.diffPct,
        label: `Strength: ${prefix}${Math.round(trendResult.diffPct * 10) / 10}%`
      };
    };
    
    const exercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number; strengthTrend: number | null; strengthLabel: string | null }> = [];
    windowedSelectionBreakdown.exercises.forEach((exData, name) => {
      const trendData = calculateExerciseStrengthTrend(name);
      exercises.push({ 
        name, 
        ...exData, 
        strengthTrend: trendData?.diffPct ?? null,
        strengthLabel: trendData?.label ?? null
      });
    });
    return exercises.sort((a, b) => b.sets - a.sets);
  }, [windowedSelectionBreakdown, exerciseStats]);

  const totalSets = useMemo(() => {
    let sum = 0;
    for (const s of data) {
      sum += getWeeklyVolumeSetWeight(s);
    }
    return sum;
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
