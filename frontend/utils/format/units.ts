import { WeightUnit } from '../storage/localStorage';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.45359237;

/**
 * Convert weight between units.
 * @param weight - The weight value
 * @param targetUnit - The unit to display in
 * @param sourceUnit - The unit the weight is stored in (default 'kg' for backward compat)
 */
export const convertWeight = (
  weight: number,
  targetUnit: WeightUnit | string,
  sourceUnit?: WeightUnit | string
): number => {
  const src = sourceUnit || 'kg';

  if (src === targetUnit) {
    if (targetUnit === 'lbs') return Number(weight.toFixed(1));
    return Number(weight.toFixed(2));
  }

  if (targetUnit === 'lbs') {
    return Number((weight * KG_TO_LBS).toFixed(1));
  }
  return Number((weight * LBS_TO_KG).toFixed(2));
};

/**
 * Format weight with unit label
 */
export const formatWeight = (
  weight: number,
  targetUnit: WeightUnit | string,
  sourceUnit?: WeightUnit | string
): string => {
  const converted = convertWeight(weight, targetUnit, sourceUnit);
  return `${converted} ${targetUnit}`;
};

/**
 * Get just the unit label
 */
export const getUnitLabel = (unit: WeightUnit | string): string => {
  return unit as string;
};

/**
 * Standard progression step in kg, matching typical plate jumps.
 * - kg: +2.5kg
 * - lbs: +5lbs (converted to kg)
 */
export const getStandardWeightIncrementKg = (unit: WeightUnit | string): number => {
  if (unit === 'lbs') {
    return 5 / KG_TO_LBS;
  }
  return 2.5;
};

/**
 * Convert volume between units.
 * @param volume - The volume value
 * @param targetUnit - The unit to display in
 * @param sourceUnit - The unit the volume is stored in (default 'kg' for backward compat)
 */
export const convertVolume = (
  volume: number,
  targetUnit: WeightUnit | string,
  sourceUnit?: WeightUnit | string
): number => {
  const src = sourceUnit || 'kg';

  if (src === targetUnit) {
    if (targetUnit === 'lbs') return Number(volume.toFixed(0));
    return Number(volume.toFixed(2));
  }

  if (targetUnit === 'lbs') {
    return Number((volume * KG_TO_LBS).toFixed(0));
  }
  return Number((volume * LBS_TO_KG).toFixed(2));
};

const KM_TO_MILES = 0.621371;

/**
 * Convert distance between units.
 * @param km - The distance value in kilometers (source of truth)
 * @param targetUnit - The unit system to display in: 'kg' (metric) or 'lbs' (imperial)
 * @returns Distance in the target unit's primary scale (km for metric, miles for imperial)
 */
export const convertDistance = (km: number, targetUnit: WeightUnit | string): number => {
  if (targetUnit === 'lbs') {
    return Number((km * KM_TO_MILES).toFixed(2));
  }
  return Number(km.toFixed(2));
};

/**
 * Format distance with the appropriate unit label for the user's unit system.
 * - kg (metric): km, or meters for distances under 1 km
 * - lbs (imperial): miles, or feet for distances under 1 mile
 */
export const formatDistance = (km: number, targetUnit: WeightUnit | string): string => {
  if (targetUnit === 'lbs') {
    const miles = km * KM_TO_MILES;
    if (miles < 1) return `${Math.round(miles * 5280)} ft`;
    return `${Number(miles.toFixed(2))} mi`;
  }
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Number(km.toFixed(2))} km`;
};
