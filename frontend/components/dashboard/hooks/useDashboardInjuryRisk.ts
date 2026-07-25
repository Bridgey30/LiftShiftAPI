import { useMemo } from 'react';
import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { computationCache } from '../../../utils/storage/computationCache';
import { createCacheKey } from '../../../utils/storage/cacheKeys';
import { computeWeeklySetsDashboardData } from '../../../utils/muscle/analytics/dashboardWeeklySets';
import {
  computeInjuryRisk,
  buildJointDays7d,
  type InjuryRiskResult,
} from '../../../utils/analysis/injury/injuryRisk';

export const useDashboardInjuryRisk = ({
  fullData,
  assetsMap,
  assetsLowerMap,
  effectiveNow,
  filterCacheKey,
}: {
  fullData: WorkoutSet[];
  assetsMap: Map<string, ExerciseAsset> | null;
  assetsLowerMap: Map<string, ExerciseAsset> | null;
  effectiveNow: Date;
  filterCacheKey: string;
}): { injuryRiskData: InjuryRiskResult[] } => {
  const injuryRiskData = useMemo(() => {
    if (!assetsMap || !assetsLowerMap || fullData.length === 0) return [];

    const cacheKey = createCacheKey('injuryRisk', filterCacheKey);

    return computationCache.getOrCompute<InjuryRiskResult[]>(
      cacheKey,
      fullData,
      () => {
        const acute = computeWeeklySetsDashboardData(
          fullData, assetsMap, effectiveNow, '7d', 'muscles', 0.5,
        );
        const chronic = computeWeeklySetsDashboardData(
          fullData, assetsMap, effectiveNow, '30d', 'muscles', 0.5,
        );
        const jointDays7d = buildJointDays7d(
          fullData, assetsMap, assetsLowerMap, effectiveNow,
        );

        return computeInjuryRisk(
          acute.weeklyRatesBySubject,
          chronic.weeklyRatesBySubject,
          jointDays7d,
        );
      },
      { ttl: 10 * 60 * 1000 },
    );
  }, [fullData, assetsMap, assetsLowerMap, effectiveNow, filterCacheKey]);

  return { injuryRiskData };
};
