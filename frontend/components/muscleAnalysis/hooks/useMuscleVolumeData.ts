import { useState, useEffect, useMemo, useCallback } from 'react';
import { WorkoutSet } from '../../../types';
import {
  loadExerciseMuscleData,
  calculateMuscleVolume,
  SVG_MUSCLE_NAMES,
  ExerciseMuscleData,
  MuscleVolumeEntry,
  getVolumeColor,
  lookupExerciseMuscleData,
  toHeadlessVolumeMap,
} from '../../../utils/muscle/mapping';
import { toHeadlessVolumeMapSum } from '../../../utils/muscle/volume/muscleVolumeUtils';
import { getExerciseAssets, ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { getEffectiveNowFromWorkoutData } from '../../../utils/date/dateUtils';
import { subDays } from 'date-fns';
import { WeeklySetsWindow } from '../../../utils/muscle/analytics';

export interface UseMuscleVolumeDataProps {
  data: WorkoutSet[];
  weeklySetsWindow: WeeklySetsWindow;
  now?: Date;
}

export interface UseMuscleVolumeDataReturn {
  exerciseMuscleData: Map<string, ExerciseMuscleData>;
  muscleVolume: Map<string, MuscleVolumeEntry>;
  isLoading: boolean;
  assetsMap: Map<string, ExerciseAsset> | null;
  windowStart: Date | null;
  effectiveNow: Date;
  allTimeWindowStart: Date | null;
  /** Lifetime total sets per headless muscle ID (all-time, sum-aggregated) */
  lifetimeHeadlessVolumes: Map<string, number>;
  getChipTextColor: (sets: number, maxSets: number) => string;
}

export function useMuscleVolumeData({
  data,
  weeklySetsWindow,
  now,
}: UseMuscleVolumeDataProps): UseMuscleVolumeDataReturn {
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());
  const [muscleVolume, setMuscleVolume] = useState<Map<string, MuscleVolumeEntry>>(new Map());
  const [lifetimeHeadlessVolumes, setLifetimeHeadlessVolumes] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);

  const effectiveNow = useMemo(() => now ?? getEffectiveNowFromWorkoutData(data), [now, data]);

  const allTimeWindowStart = useMemo(() => {
    let start: Date | null = null;
    for (const s of data) {
      const d = s.parsedDate;
      if (!d) continue;
      if (!start || d < start) start = d;
    }
    return start;
  }, [data]);

  const windowStart = useMemo(() => {
    if (!allTimeWindowStart) return null;
    if (weeklySetsWindow === 'all') return allTimeWindowStart;

    // Show current period + previous period (2x window) for better visual comparison
    const candidate =
      weeklySetsWindow === '7d'
        ? subDays(effectiveNow, 14)   // current week + previous week
        : weeklySetsWindow === '30d'
          ? subDays(effectiveNow, 60) // current month + previous month
          : subDays(effectiveNow, 730); // current year + previous year

    // Clamp to the user's first workout date so we don't include pre-history empty time.
    return allTimeWindowStart > candidate ? allTimeWindowStart : candidate;
  }, [weeklySetsWindow, effectiveNow, allTimeWindowStart]);

  const getChipTextColor = useCallback((sets: number, maxSets: number): string => {
    const ratio = sets / Math.max(maxSets, 1);
    return ratio >= 0.55 ? '#ffffff' : '#0f172a';
  }, []);

  // Load exercise muscle data and assets on mount
  useEffect(() => {
    loadExerciseMuscleData().then(loadedData => {
      setExerciseMuscleData(loadedData);
      setIsLoading(false);
    });
    getExerciseAssets()
      .then(m => setAssetsMap(m))
      .catch(() => setAssetsMap(new Map()));
  }, []);

  // Calculate muscle volumes whenever data or windowStart changes
  useEffect(() => {
    if (exerciseMuscleData.size === 0 || data.length === 0) {
      setMuscleVolume(new Map());
      return;
    }

    // Filter data based on selected window to ensure BodyMap matches the time period
    let processedData = data;
    if (windowStart) {
      processedData = data.filter(s => s.parsedDate && s.parsedDate >= windowStart);
    }

    calculateMuscleVolume(processedData, exerciseMuscleData).then(setMuscleVolume);
  }, [data, exerciseMuscleData, windowStart]);

  // Calculate lifetime (all-time) headless muscle volumes for achievement tracking
  useEffect(() => {
    if (exerciseMuscleData.size === 0 || data.length === 0) {
      setLifetimeHeadlessVolumes(new Map());
      return;
    }

    calculateMuscleVolume(data, exerciseMuscleData).then((allTimeVolume) => {
      // Convert detailed SVG volumes → headless muscle totals (sum, not max)
      const detailedSets = new Map<string, number>();
      allTimeVolume.forEach((entry, svgId) => {
        detailedSets.set(svgId, entry.sets);
      });
      setLifetimeHeadlessVolumes(toHeadlessVolumeMapSum(detailedSets));
    });
  }, [data, exerciseMuscleData]);

  return {
    exerciseMuscleData,
    muscleVolume,
    isLoading,
    assetsMap,
    windowStart,
    effectiveNow,
    allTimeWindowStart,
    lifetimeHeadlessVolumes,
    getChipTextColor,
  };
}
