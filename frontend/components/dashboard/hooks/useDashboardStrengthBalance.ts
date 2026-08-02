import { useMemo } from 'react';
import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { computationCache } from '../../../utils/storage/computationCache';
import { createCacheKey } from '../../../utils/storage/cacheKeys';
import {
  computeStrengthBalance,
  pickTopFindings,
  type StrengthBalancePairResult,
} from '../../../utils/analysis/strengthBalance/strengthBalance';
import {
  buildStrengthBalanceAnomalySegments,
  buildStrengthBalanceCompactSegments,
  buildStrengthBalanceTldr,
  type StrengthBalanceSegment,
} from '../../../utils/analysis/strengthBalance/strengthBalanceCopy';

export interface StrengthBalanceLine {
  segments: StrengthBalanceSegment[];
  confidence: 'high' | 'medium';
}

export const useDashboardStrengthBalance = ({
  fullData,
  assetsMap,
  effectiveNow,
  filterCacheKey,
}: {
  fullData: WorkoutSet[];
  assetsMap: Map<string, ExerciseAsset> | null;
  effectiveNow: Date;
  filterCacheKey: string;
}): { strengthBalanceItems: StrengthBalanceLine[] | null; strengthBalanceTldr: string | null; strengthBalanceResults: StrengthBalancePairResult[] } => {
  const { results, items, tldr } = useMemo(() => {
    if (!assetsMap || fullData.length === 0) return { results: [], items: null, tldr: null };

    const cacheKey = createCacheKey('strengthBalance', filterCacheKey);

    const results = computationCache.getOrCompute<StrengthBalancePairResult[]>(
      cacheKey,
      fullData,
      () => computeStrengthBalance(fullData, assetsMap, effectiveNow),
      { ttl: 10 * 60 * 1000 }
    );

    const findings = pickTopFindings(results);
    if (findings.length === 0) return { results, items: null, tldr: null };

    const items: StrengthBalanceLine[] = [];
    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];
      const full = i === 0 && finding.confidence === 'high'
        ? buildStrengthBalanceAnomalySegments(finding)
        : null;
      const segments = full ?? buildStrengthBalanceCompactSegments(finding);
      if (segments) items.push({ segments, confidence: finding.confidence });
    }
    return { results, items, tldr: buildStrengthBalanceTldr(findings) };
  }, [fullData, assetsMap, effectiveNow, filterCacheKey]);

  return { strengthBalanceItems: items, strengthBalanceTldr: tldr, strengthBalanceResults: results };
};
