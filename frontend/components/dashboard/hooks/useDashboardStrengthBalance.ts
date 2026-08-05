import { useMemo } from 'react';
import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { computationCache } from '../../../utils/storage/computationCache';
import { createCacheKey } from '../../../utils/storage/cacheKeys';
import { useStrengthBalanceDismissals } from '../../../utils/storage/strengthBalanceDismissals';
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
  filteredData,
  assetsMap,
  effectiveNow,
  filterCacheKey,
}: {
  filteredData: WorkoutSet[];
  assetsMap: Map<string, ExerciseAsset> | null;
  effectiveNow: Date;
  filterCacheKey: string;
}): { strengthBalanceResults: StrengthBalancePairResult[]; strengthBalanceItems: StrengthBalanceLine[] | null; strengthBalanceTldr: string | null } => {
  const dismissed = useStrengthBalanceDismissals();

  const { results, items, tldr } = useMemo(() => {
    if (!assetsMap || filteredData.length === 0) return { results: [], items: null, tldr: null };

    const cacheKey = createCacheKey('strengthBalance', filterCacheKey);

    const allResults = computationCache.getOrCompute<StrengthBalancePairResult[]>(
      cacheKey,
      filteredData,
      () => computeStrengthBalance(filteredData, assetsMap, effectiveNow),
      { ttl: 10 * 60 * 1000 }
    );

    const results = dismissed.size > 0
      ? allResults.filter((r) => !dismissed.has(r.pair.id))
      : allResults;

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
  }, [filteredData, assetsMap, effectiveNow, filterCacheKey, dismissed]);

  return { strengthBalanceResults: results, strengthBalanceItems: items, strengthBalanceTldr: tldr };
};
