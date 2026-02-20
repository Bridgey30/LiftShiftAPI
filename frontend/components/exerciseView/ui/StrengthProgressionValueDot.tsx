import React from 'react';
import { Trophy, Award, BarChart3 } from 'lucide-react';
import { ExerciseStats, PrType } from '../../../types';
import { ExerciseSessionEntry } from '../../../utils/analysis/exerciseTrend';
import { convertWeight } from '../../../utils/format/units';
import { formatNumber } from '../../../utils/format/formatters';
import { WeightUnit } from '../../../utils/storage/localStorage';

export const StrengthProgressionValueDot = (props: any) => {
  const {
    cx,
    cy,
    payload,
    index,
    data,
    valueKey,
    unit,
    showDotWhenHidden = true,
    color = 'var(--text-muted)',
    prTypesToShow,
  } = props;

  if (!payload || cx === undefined || cy === undefined) return null;

  const value = payload[valueKey];
  if (typeof value !== 'number') return null;

  const prGold = '#d97706';
  const prSilver = '#64748b';
  const eps = 0.001;

  // Calculate global max value for this metric across all data
  let globalMaxValue = -Infinity;
  let firstGlobalMaxIndex: number | null = null;
  
  // Calculate max silver value and its first index
  let maxSilverValue = -Infinity;
  let firstSilverMaxIndex: number | null = null;
  
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const v = row?.[valueKey];
      
      if (typeof v !== 'number') continue;

      // Track global max
      if (v > globalMaxValue) {
        globalMaxValue = v;
        firstGlobalMaxIndex = i;
      }

      // Track silver max
      if (row?.isSilverPr && v > maxSilverValue) {
        maxSilverValue = v;
        firstSilverMaxIndex = i;
      }
    }
  }

  const isGlobalMax = Number.isFinite(globalMaxValue) && Math.abs(value - globalMaxValue) <= eps;

  // Get PR types from payload
  const combinedPrTypes: PrType[] = payload.prTypes || [];
  let allPrTypes: PrType[] = combinedPrTypes;
  
  if (valueKey === 'weight' && payload.weightPrTypes) {
    allPrTypes = payload.weightPrTypes;
  } else if (valueKey === 'oneRepMax' && payload.oneRmPrTypes) {
    allPrTypes = payload.oneRmPrTypes;
  }

  let filteredPrTypes = prTypesToShow
    ? allPrTypes.filter((t: PrType) => prTypesToShow.includes(t))
    : allPrTypes;


  // Check for Gold PR
  const shouldShowPr = isGlobalMax && filteredPrTypes.length > 0;
  
  // DEBUG: Log specifically for Lat Pulldown
  if (payload.date?.includes('Dec') || payload.date?.includes('9')) {
    console.log('LatPulldown:', { date: payload.date, valueKey, value, globalMaxValue, isGlobalMax, isPr: payload.isPr, weightPrTypes: payload.weightPrTypes, oneRmPrTypes: payload.oneRmPrTypes, prTypesToShow, filteredPrTypes, shouldShowPr });
  }

  // Get Silver PR types
  const combinedSilverPrTypes: PrType[] = payload.silverPrTypes || [];
  let allSilverPrTypes: PrType[] = combinedSilverPrTypes;
  
  if (valueKey === 'weight' && payload.silverWeightPrTypes) {
    allSilverPrTypes = payload.silverWeightPrTypes;
  } else if (valueKey === 'oneRepMax' && payload.silverOneRmPrTypes) {
    allSilverPrTypes = payload.silverOneRmPrTypes;
  }

  let filteredSilverPrTypes = prTypesToShow
    ? allSilverPrTypes.filter((t: PrType) => prTypesToShow.includes(t))
    : allSilverPrTypes;

  // Suppress 1RM silver if weight silver exists on same session
  if (prTypesToShow?.includes('oneRm') && payload.silverWeightPrTypes?.length > 0 && payload.silverOneRmPrTypes?.length > 0) {
    filteredSilverPrTypes = filteredSilverPrTypes.filter((t: PrType) => t !== 'oneRm');
  }

  // Check for Silver PR (only if not showing gold)
  const isSilverPr = !shouldShowPr && payload.isSilverPr && filteredSilverPrTypes.length > 0;
  const isMaxSilverPr = isSilverPr && index === firstSilverMaxIndex && Number.isFinite(maxSilverValue) && Math.abs(value - maxSilverValue) <= eps;

  // Show label for gold PR at first max, or for silver PR at max silver
  const shouldShowLabel = shouldShowPr 
    ? index === firstGlobalMaxIndex 
    : isMaxSilverPr;

  if (!shouldShowLabel) {
    if (!showDotWhenHidden) return null;
    const dotColor = shouldShowPr ? prGold : isSilverPr ? prSilver : color;
    return <circle cx={cx} cy={cy} r={3} fill={dotColor} stroke={dotColor} strokeWidth={1} />;
  }

  const displayValue = unit
    ? `${formatNumber(value, { maxDecimals: 1 })}${unit}`
    : Number.isInteger(value)
      ? value.toString()
      : formatNumber(value, { maxDecimals: 1 });

  // Calculate positioning
  const totalPoints = Array.isArray(data) ? data.length : 0;
  const isOnRightSide = totalPoints > 0 && (index ?? 0) >= totalPoints * 0.7;
  const isOnLeftSide = totalPoints > 0 && (index ?? 0) <= totalPoints * 0.3;
  const isNearTop = cy < 30;

  const labelY = isNearTop ? cy + 16 : cy - 10;
  const charWidth = 5.5;
  const textWidth = displayValue.length * charWidth;

  let trophyX: number;
  if (isOnRightSide) {
    trophyX = cx - textWidth / 2 - 12;
  } else if (isOnLeftSide) {
    trophyX = cx + textWidth / 2 + 3;
  } else {
    trophyX = cx + textWidth / 2 + 3;
  }

  const trophyY = labelY - 8;

  // Select icon
  const activePrTypes = shouldShowPr ? filteredPrTypes : filteredSilverPrTypes;
  let TrophyIcon = Trophy;
  if (activePrTypes.includes('weight')) {
    TrophyIcon = Trophy;
  } else if (activePrTypes.includes('oneRm')) {
    TrophyIcon = Award;
  } else if (activePrTypes.includes('volume')) {
    TrophyIcon = BarChart3;
  }

  // Styling
  const dotColor = shouldShowPr ? prGold : prSilver;
  const iconSize = isSilverPr ? 8 : 10;
  const iconOpacity = isSilverPr ? 0.7 : 1;

  return (
    <g>
      <circle cx={cx} cy={cy} r={isSilverPr ? 2 : 3} fill={dotColor} stroke={dotColor} strokeWidth={1} opacity={iconOpacity} />
      <text x={cx} y={labelY} fill={dotColor} fontSize={isSilverPr ? 8 : 9} fontWeight={isSilverPr ? 'normal' : 'bold'} textAnchor="middle" opacity={iconOpacity}>
        {displayValue}
      </text>
      <g transform={`translate(${trophyX}, ${trophyY})`} opacity={iconOpacity}>
        <TrophyIcon width={iconSize} height={iconSize} stroke={dotColor} fill={dotColor} />
      </g>
    </g>
  );
};
