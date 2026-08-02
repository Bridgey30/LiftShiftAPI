import { useMemo } from 'react';
import type { WorkoutSet } from '../../../types';
import { computationCache } from '../../../utils/storage/computationCache';
import {
  computeWeeklySetsDashboardData,
  type WeeklySetsDashboardResult,
  type WeeklySetsWindow,
} from '../../../utils/muscle/analytics';
import { toMuscleVolumeMap } from '../../../utils/muscle/mapping';
import { MUSCLE_GROUP_ORDER, SVG_TO_MUSCLE_GROUP, getMuscleRadarSeries } from '../../../utils/muscle/mapping';
import type { NormalizedMuscleGroup } from '../../../utils/muscle/analytics';
import { resolveSelectedSubjectKeys } from '../utils/selectedSubjectKeys';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { muscleCacheKeys } from '../../../utils/storage/cacheKeys';

interface UseMuscleHeatmapDataParams {
  data: WorkoutSet[];
  assetsMap: Map<string, ExerciseAsset> | null;
  windowStart: Date | null;
  effectiveNow: Date;
  weeklySetsWindow: WeeklySetsWindow;
  selectedMuscle: string | null;
  filterCacheKey: string;
  secondarySetMultiplier: number;
}

export const useMuscleHeatmapData = ({
  data,
  assetsMap,
  windowStart,
  effectiveNow,
  weeklySetsWindow,
  selectedMuscle,
  filterCacheKey,
  secondarySetMultiplier,
}: UseMuscleHeatmapDataParams) => {
  const getWeeklySetsDashboard = (
    cacheKey: string,
    window: WeeklySetsWindow,
    grouping: 'muscles' | 'groups'
  ): WeeklySetsDashboardResult => {
    const compute = () =>
      computeWeeklySetsDashboardData(data, assetsMap!, effectiveNow, window, grouping, secondarySetMultiplier);

    const cached = computationCache.getOrCompute<WeeklySetsDashboardResult>(
      cacheKey,
      data,
      compute,
      { ttl: 10 * 60 * 1000 }
    );

    // Older dashboard cache entries stored a heatmap-only shape under this key.
    // If we encounter one, force a recompute so tooltip rates are available.
    if (!(cached.weeklyRatesBySubject instanceof Map)) {
      return computationCache.getOrCompute<WeeklySetsDashboardResult>(
        cacheKey,
        data,
        compute,
        { ttl: 10 * 60 * 1000, forceRecompute: true }
      );
    }

    return cached;
  };

  const weeklySetsDashboardMuscles = useMemo(() => {
    if (!assetsMap) return null;

    const window: WeeklySetsWindow = weeklySetsWindow === 'all' ? 'all' : weeklySetsWindow;
    const cacheKey = muscleCacheKeys.weeklySets(filterCacheKey, window, 'muscles', secondarySetMultiplier);
    return getWeeklySetsDashboard(cacheKey, window, 'muscles');
  }, [assetsMap, data, effectiveNow, weeklySetsWindow, filterCacheKey, secondarySetMultiplier]);

  const weeklySetsDashboardGroups = useMemo(() => {
    if (!assetsMap) return null;

    const window: WeeklySetsWindow = weeklySetsWindow === 'all' ? 'all' : weeklySetsWindow;
    const cacheKey = muscleCacheKeys.weeklySets(filterCacheKey, window, 'groups', secondarySetMultiplier);
    return getWeeklySetsDashboard(cacheKey, window, 'groups');
  }, [assetsMap, data, effectiveNow, weeklySetsWindow, filterCacheKey, secondarySetMultiplier]);

  const windowedHeatmapData = useMemo(() => {
    if (!assetsMap || !windowStart) return { volumes: new Map<string, number>(), maxVolume: 1 };

    const heatmap = weeklySetsDashboardMuscles?.heatmap ?? { volumes: new Map<string, number>(), maxVolume: 1 };
    const muscleVolumeMap = toMuscleVolumeMap(heatmap.volumes);
    const muscleMaxVolume = Math.max(1, ...(Array.from(muscleVolumeMap.values()) as number[]));
    return { volumes: muscleVolumeMap, maxVolume: muscleMaxVolume };
  }, [assetsMap, windowStart, weeklySetsDashboardMuscles]);

  const muscleVolumes = useMemo(() => windowedHeatmapData.volumes, [windowedHeatmapData]);
  const maxVolume = useMemo(() => Math.max(windowedHeatmapData.maxVolume, 1), [windowedHeatmapData]);

  const windowedGroupVolumes = useMemo(() => {
    const groupVolumes = new Map<NormalizedMuscleGroup, number>();
    MUSCLE_GROUP_ORDER.forEach((g) => groupVolumes.set(g, 0));

    if (!assetsMap || !windowStart) return groupVolumes;

    const weeklyRatesBySubject = weeklySetsDashboardGroups?.weeklyRatesBySubject;
    if (!weeklyRatesBySubject) return groupVolumes;

    for (const [subject, value] of weeklyRatesBySubject.entries()) {
      const group = subject as NormalizedMuscleGroup;
      if (MUSCLE_GROUP_ORDER.includes(group)) groupVolumes.set(group, value);
    }

    return groupVolumes;
  }, [assetsMap, windowStart, weeklySetsDashboardGroups]);

  const groupedBodyMapVolumes = useMemo(() => {
    const volumes = new Map<string, number>();
    Object.entries(SVG_TO_MUSCLE_GROUP).forEach(([svgId, group]) => {
      if (group !== 'Other') {
        volumes.set(svgId, windowedGroupVolumes.get(group) || 0);
      }
    });
    return volumes;
  }, [windowedGroupVolumes]);

  const maxGroupVolume = useMemo(() => {
    let max = 0;
    windowedGroupVolumes.forEach((v) => {
      if (v > max) max = v;
    });
    return Math.max(max, 1);
  }, [windowedGroupVolumes]);

  const selectedSubjectKeys = useMemo(() => {
    return resolveSelectedSubjectKeys({ selectedMuscle });
  }, [selectedMuscle]);

  const groupWeeklyRatesBySubject = useMemo(() => {
    if (!assetsMap || !windowStart) return null;
    return weeklySetsDashboardGroups?.weeklyRatesBySubject ?? null;
  }, [assetsMap, windowStart, weeklySetsDashboardGroups]);

  const muscleRatesMap = useMemo(() => {
    if (!assetsMap || !windowStart) return new Map<string, number>();
    return weeklySetsDashboardMuscles?.weeklyRatesBySubject ?? new Map<string, number>();
  }, [assetsMap, windowStart, weeklySetsDashboardMuscles]);

  const radarData = useMemo(() => getMuscleRadarSeries(muscleRatesMap), [muscleRatesMap]);

  return {
    weeklySetsDashboardMuscles,
    weeklySetsDashboardGroups,
    windowedHeatmapData,
    muscleVolumes,
    maxVolume,
    windowedGroupVolumes,
    groupedBodyMapVolumes,
    maxGroupVolume,
    selectedSubjectKeys,
    groupWeeklyRatesBySubject,
    muscleRatesMap,
    radarData,
  };
};
