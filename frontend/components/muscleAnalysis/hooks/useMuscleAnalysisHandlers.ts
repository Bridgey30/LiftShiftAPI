import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMuscleIdForDetailedSvgId,
  MUSCLE_NAMES,
} from '../../../utils/muscle/mapping';
import { getRelatedMuscleIds } from '../../bodyMap/BodyMap';
import { getVolumeThresholds, getVolumeZone } from '../../../utils/muscle/hypertrophy';
import type { TooltipData } from '../../ui/Tooltip';
import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import type { TrainingLevel } from '../../../utils/muscle/hypertrophy/muscleParams';
import { FACTOR_WEIGHTS, HypertrophyScoreResult } from '../../../utils/muscle/hypertrophy/hypertrophyScore';

interface UseMuscleAnalysisHandlersParams {
  selectedMuscle: string | null;
  setSelectedMuscle: React.Dispatch<React.SetStateAction<string | null>>;
  selectedSvgIdForUrlRef: React.MutableRefObject<string | null>;
  clearSelectionUrl: () => void;
  updateSelectionUrl: (payload: { svgId: string; window: WeeklySetsWindow }) => void;
  weeklySetsWindow: WeeklySetsWindow;
  muscleRatesMap: Map<string, number>;
  setHoverTooltip: (value: TooltipData | null) => void;
  trainingLevel: TrainingLevel;
  /** Pre-computed hypertrophy score results per muscle */
  hypertrophyScoreMap: Map<string, HypertrophyScoreResult>;
}

export const useMuscleAnalysisHandlers = ({
  selectedMuscle,
  setSelectedMuscle,
  selectedSvgIdForUrlRef,
  clearSelectionUrl,
  updateSelectionUrl,
  weeklySetsWindow,
  muscleRatesMap,
  setHoverTooltip,
  trainingLevel,
  hypertrophyScoreMap,
}: UseMuscleAnalysisHandlersParams) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [hoverContext, setHoverContext] = useState<{ muscleId: string; rect: DOMRect } | null>(null);

  const volumeThresholds = useMemo(() => getVolumeThresholds(trainingLevel), [trainingLevel]);

  const buildTooltip = useCallback((muscleId: string, rect: DOMRect): TooltipData => {
    const mappedMuscleId = getMuscleIdForDetailedSvgId(muscleId) ?? muscleId;
    const rate = muscleRatesMap.get(mappedMuscleId) || 0;
    const hScoreData = hypertrophyScoreMap.get(mappedMuscleId);

    if (hScoreData) {
      const volW = Math.round(hScoreData.volumeScore * FACTOR_WEIGHTS.volumeScore);
      const progW = Math.round(hScoreData.progressiveOverload);
      const freqW = Math.round(hScoreData.frequency * FACTOR_WEIGHTS.frequency);
      const volMax = Math.round(FACTOR_WEIGHTS.volumeScore * 100);
      const progMax = Math.round(FACTOR_WEIGHTS.progressiveOverload * 100);
      const freqMax = Math.round(FACTOR_WEIGHTS.frequency * 100);
      const raw = hScoreData.raw;
      const trendSign = raw.oneRMTrend > 0 ? '+' : '';

      const displayName = (MUSCLE_NAMES as any)[mappedMuscleId] ?? muscleId;
      return {
        rect,
        title: `${displayName} : ${hScoreData.totalScore}%`,
        bodySections: [
          { text: `Volume: ${volW}/${volMax} → ${raw.weeklySets.toFixed(1)} sets/week`, color: volW <= 15 ? '#ef4444' : volW <= 35 ? '#f59e0b' : '#22c55e' },
          { text: `Progress: ${progW}/${progMax} → ${trendSign}${raw.oneRMTrend.toFixed(1)}% trend`, color: progW <= 11 ? '#ef4444' : progW <= 22 ? '#f59e0b' : '#22c55e' },
          { text: `Frequency: ${freqW}/${freqMax} → ${raw.daysPerWeek.toFixed(1)} days/week`, color: freqW <= 3 ? '#ef4444' : freqW <= 6 ? '#f59e0b' : '#22c55e' },
        ],
        status: hScoreData.totalScore >= 60 ? 'success' : hScoreData.totalScore >= 40 ? 'info' : 'warning',
      };
    }

    const zone = getVolumeZone(rate, volumeThresholds);
    return {
      rect,
      title: (MUSCLE_NAMES as any)[mappedMuscleId] ?? muscleId,
      body: `${rate.toFixed(1)} sets/wk — ${zone.label}\n${zone.explanation}`,
      status: rate > 0 ? 'success' : 'default',
    };
  }, [muscleRatesMap, hypertrophyScoreMap, volumeThresholds]);

  const handleMuscleClick = useCallback((muscleId: string) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    setSelectedMuscle((prev) => {
      const next = prev === muscleId ? null : muscleId;
      if (!next) {
        selectedSvgIdForUrlRef.current = null;
        clearSelectionUrl();
      } else {
        selectedSvgIdForUrlRef.current = muscleId;
        updateSelectionUrl({ svgId: muscleId, window: weeklySetsWindow });
        // Scroll to detail panel on mobile after selection
        if (isMobile) {
          setTimeout(() => {
            const detailPanel = document.querySelector('[data-muscle-detail-panel]');
            detailPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }
      }
      return next;
    });
  }, [clearSelectionUrl, updateSelectionUrl, weeklySetsWindow, setSelectedMuscle, selectedSvgIdForUrlRef]);

  const handleMuscleHover = useCallback((muscleId: string | null, e?: MouseEvent) => {
    setHoveredMuscle(muscleId);
    if (!muscleId || !e) {
      setHoverContext(null);
      setHoverTooltip(null);
      return;
    }

    const target = e.target as Element | null;
    const groupEl = target?.closest?.('g[id]') as Element | null;
    const rect = groupEl?.getBoundingClientRect?.() as DOMRect | undefined;
    if (!rect) {
      setHoverContext(null);
      setHoverTooltip(null);
      return;
    }

    setHoverContext({ muscleId, rect });
    setHoverTooltip(buildTooltip(muscleId, rect));
  }, [buildTooltip, setHoverTooltip]);

  useEffect(() => {
    if (!hoverContext) return;
    setHoverTooltip(buildTooltip(hoverContext.muscleId, hoverContext.rect));
  }, [hoverContext, buildTooltip, setHoverTooltip]);

  const selectedBodyMapIds = useMemo(() => {
    if (!selectedMuscle) return undefined;
    return getRelatedMuscleIds(selectedMuscle);
  }, [selectedMuscle]);

  const hoveredBodyMapIds = useMemo(() => {
    if (!hoveredMuscle) return undefined;
    return getRelatedMuscleIds(hoveredMuscle);
  }, [hoveredMuscle]);

  return {
    hoveredMuscle,
    handleMuscleClick,
    handleMuscleHover,
    selectedBodyMapIds,
    hoveredBodyMapIds,
  };
};
