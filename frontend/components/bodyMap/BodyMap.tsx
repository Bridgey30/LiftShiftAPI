import React, { useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { getVolumeColor, getExerciseMuscleColor, getHypertrophyColor, SVG_MUSCLE_GROUPS, CSV_TO_SVG_MUSCLE_MAP, getMuscleIdForDetailedSvgId } from '../../utils/muscle/mapping';
import { INTERACTIVE_MUSCLE_IDS } from '../../utils/muscle/mapping';
import { getMuscleWithFallback } from '../../utils/muscle/mapping/bodyMapAvailability';
import type { MuscleVolumeThresholds } from '../../utils/muscle/hypertrophy/muscleParams';
import MaleFrontBodyMapMuscle from './muscles/MaleFrontBodyMapMuscle';
import MaleBackBodyMapMuscle from './muscles/MaleBackBodyMapMuscle';
import MaleFrontBodyMapGroup from './groups/MaleFrontBodyMapGroup';
import MaleBackBodyMapGroup from './groups/MaleBackBodyMapGroup';
import MaleFrontBodyMap from './male/MaleFrontBodyMap';
import MaleBackBodyMap from './male/MaleBackBodyMap';
import FemaleFrontBodyMapMuscle from './muscles/FemaleFrontBodyMapMuscle';
import FemaleBackBodyMapMuscle from './muscles/FemaleBackBodyMapMuscle';
import FemaleFrontBodyMapGroup from './groups/FemaleFrontBodyMapGroup';
import FemaleBackBodyMapGroup from './groups/FemaleBackBodyMapGroup';
import type { BodyWarpParams } from '../../hooks/useBodyMapWarp';
import type { BodyMapStrokeConfig } from '../../config/bodyMapWarp';

export type BodyMapGender = 'male' | 'female';
export type BodyMapVariant = 'original' | 'demo';

interface BodyMapProps {
  onPartClick: (muscleGroup: string) => void;
  selectedPart: string | null;
  selectedMuscleIdsOverride?: string[];
  hoveredMuscleIdsOverride?: string[];
  muscleVolumes: Map<string, number>;
  maxVolume?: number;
  volumeThresholds?: MuscleVolumeThresholds;
  useExerciseColors?: boolean;
  useHypertrophyColors?: boolean;
  onPartHover?: (muscleGroup: string | null, e?: MouseEvent) => void;
  compact?: boolean;
  compactFill?: boolean;
  interactive?: boolean;
  gender?: BodyMapGender;
  variant?: BodyMapVariant;
  warpParams?: BodyWarpParams;
  stroke?: Partial<BodyMapStrokeConfig>;
  viewMode?: 'original' | 'headless';
}

// Hover and selection highlight colors (theme-driven)
const HOVER_HIGHLIGHT = 'rgb(var(--bodymap-hover-rgb) / 1)';
const SELECTION_HIGHLIGHT = 'rgb(var(--bodymap-selection-rgb) / 1)';

const INTERACTIVE_MUSCLES: readonly string[] = INTERACTIVE_MUSCLE_IDS;

export const getRelatedMuscleIds = (muscleGroup: string | null): string[] => {
  if (!muscleGroup) return [];
  const groupName = SVG_MUSCLE_GROUPS[muscleGroup];
  if (!groupName) {
    const capitalized = muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1);
    const direct = CSV_TO_SVG_MUSCLE_MAP[muscleGroup] ?? CSV_TO_SVG_MUSCLE_MAP[capitalized];
    return direct ?? [muscleGroup];
  }
  const relatedIds = new Set<string>();
  relatedIds.add(muscleGroup);
  const csvEntry = CSV_TO_SVG_MUSCLE_MAP[groupName];
  if (csvEntry) {
    csvEntry.forEach(id => relatedIds.add(id));
  }
  for (const [svgId, grp] of Object.entries(SVG_MUSCLE_GROUPS)) {
    if (grp === groupName) relatedIds.add(svgId);
  }
  return Array.from(relatedIds);
};

export const BodyMap: React.FC<BodyMapProps> = ({
  onPartClick,
  selectedPart,
  selectedMuscleIdsOverride,
  hoveredMuscleIdsOverride,
  muscleVolumes,
  maxVolume = 1,
  volumeThresholds,
  useExerciseColors = false,
  useHypertrophyColors = false,
  onPartHover,
  compact = false,
  compactFill = false,
  interactive = false,
  gender = 'male',
  variant = 'demo',
  warpParams = undefined,
  stroke = undefined,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredMuscleRef = useRef<string | null>(null);
  const selectedMuscleIds = useMemo(
    () => selectedMuscleIdsOverride
      ? selectedMuscleIdsOverride.flatMap(id => getRelatedMuscleIds(id))
      : getRelatedMuscleIds(selectedPart),
    [selectedMuscleIdsOverride, selectedPart]
  );

  const effectiveGender: BodyMapGender = (gender ?? 'male') as BodyMapGender;
  const effectiveVariant: BodyMapVariant = (variant ?? 'demo') as BodyMapVariant;

  const applyColors = useCallback((hoveredId: string | null = null) => {
    if (!containerRef.current) return;
    INTERACTIVE_MUSCLES.forEach(muscleId => {
      const targetId = getMuscleWithFallback(muscleId, effectiveVariant, effectiveGender);
      const elements = containerRef.current?.querySelectorAll(`#${targetId}`);
      const isOriginalSelection = muscleId !== targetId;
      elements?.forEach(el => {
        const headlessId = getMuscleIdForDetailedSvgId(muscleId) ?? muscleId;
        const volume = muscleVolumes.get(muscleId) ?? muscleVolumes.get(headlessId) ?? 0;
        const color = useExerciseColors
          ? getExerciseMuscleColor(volume)
          : useHypertrophyColors
            ? getHypertrophyColor(volume)
            : getVolumeColor(volume, volumeThresholds, maxVolume);
        const isSelected = selectedMuscleIds.includes(muscleId) || (isOriginalSelection && selectedMuscleIds.includes(targetId));
        const isHovered = hoveredMuscleIdsOverride
          ? hoveredMuscleIdsOverride.some(id => getRelatedMuscleIds(id).includes(muscleId))
          : (hoveredId === muscleId || (hoveredId && getRelatedMuscleIds(hoveredId).includes(muscleId)));
        
        el.querySelectorAll('path').forEach(path => {
          path.style.transition = 'all 0.15s ease';
          // Stroke is handled by useBodyMapWarp hook - only set fill here
          // Volume-based color
          path.style.fill = color;
          path.style.filter = '';
          
          if (isSelected) {
            // Selected state - should be clearly distinguishable from hover.
            path.style.fill = SELECTION_HIGHLIGHT;
            path.style.filter = 'brightness(1.12)';
          } else if (isHovered) {
            // Hover state - uses a distinct (non-palette) hover color.
            path.style.fill = HOVER_HIGHLIGHT;
            path.style.filter = 'brightness(1.08)';
          } else {
            // Default state - volume-based color
            path.style.fill = color;
            path.style.filter = '';
          }
        });
        (el as HTMLElement).style.cursor = compact && !interactive ? 'default' : 'pointer';
      });
    });
  }, [muscleVolumes, maxVolume, selectedMuscleIds, hoveredMuscleIdsOverride, interactive, useExerciseColors, useHypertrophyColors, volumeThresholds]);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as Element;
    const muscleGroup = target.closest('g[id]');
    if (muscleGroup && INTERACTIVE_MUSCLES.includes(muscleGroup.id)) {
      const targetId = getMuscleWithFallback(muscleGroup.id, effectiveVariant, effectiveGender);
      onPartClick(targetId);
    }
  }, [onPartClick, effectiveVariant, effectiveGender]);

  const handleMouseOver = useCallback((e: MouseEvent) => {
    const target = e.target as Element;
    const muscleGroup = target.closest('g[id]');
    if (muscleGroup && INTERACTIVE_MUSCLES.includes(muscleGroup.id)) {
      const hoveredId = muscleGroup.id;
      hoveredMuscleRef.current = hoveredId;
      // If hover ids are controlled externally (e.g. group view), let parent drive highlighting.
      if (!hoveredMuscleIdsOverride) {
        applyColors(hoveredId);
      }
      onPartHover?.(hoveredId, e);
    }
  }, [onPartHover, applyColors, hoveredMuscleIdsOverride]);

  const handleMouseOut = useCallback((e: MouseEvent) => {
    hoveredMuscleRef.current = null;
    if (!hoveredMuscleIdsOverride) {
      applyColors(null);
    }
    onPartHover?.(null, e);
  }, [onPartHover, applyColors, hoveredMuscleIdsOverride]);

  useLayoutEffect(() => {
    applyColors(hoveredMuscleRef.current);
    const container = containerRef.current;
    if (!container) return;
    // Skip event listeners for compact (mini) body maps - no interaction
    if (compact && !interactive) return;
    container.addEventListener('click', handleClick);
    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
    };
  }, [applyColors, handleClick, handleMouseOver, handleMouseOut, compact, interactive]);

  const svgClass = compact 
    ? (compactFill ? 'h-full w-auto' : 'h-28 w-auto') 
    : 'h-[45vh] sm:h-[50vh] md:h-[55vh] lg:h-[60vh] xl:h-[65vh] 2xl:max-h-[55vh] w-auto max-h-[500px]';

  const isDemoVariant = variant === 'demo' && gender === 'male';
  
  const FrontSvg = isDemoVariant
    ? MaleFrontBodyMap
    : (gender === 'female' 
      ? FemaleFrontBodyMapGroup
      : MaleFrontBodyMapGroup);
  
  const BackSvg = isDemoVariant
    ? MaleBackBodyMap
    : (gender === 'female'
      ? FemaleBackBodyMapGroup
      : MaleBackBodyMapGroup);

  return (
    <div 
      ref={containerRef}
      className={`flex justify-center items-center ${compact ? 'gap-0' : 'gap-4'} w-full ${compactFill ? 'h-full' : ''}`}
    >
      <FrontSvg className={svgClass} warpOverrides={warpParams} stroke={stroke} />
      <BackSvg className={svgClass} warpOverrides={warpParams} stroke={stroke} />
    </div>
  );
};
