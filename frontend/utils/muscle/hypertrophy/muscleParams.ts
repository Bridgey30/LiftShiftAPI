import type { HeadlessMuscleId } from '../mapping/muscleHeadless';
import { HEADLESS_MUSCLE_IDS } from '../mapping/muscleHeadless';

// ---------------------------------------------------------------------------
// Muscle size classification
// ---------------------------------------------------------------------------
export type MuscleSizeCategory = 'large' | 'medium' | 'small';

// ---------------------------------------------------------------------------
// Volume thresholds (single source of truth)
// ---------------------------------------------------------------------------
export interface MuscleVolumeThresholds {
  readonly mv: number;   // Maintenance volume - below this: minimal stimulus
  readonly mev: number; // Minimum effective volume - start of meaningful growth
  readonly mrv: number; // Maximum recoverable volume - optimal upper bound
  readonly maxv: number; // Maximum volume before diminishing returns
}

// ---------------------------------------------------------------------------
// Training level categorization
// ---------------------------------------------------------------------------
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

export const VOLUME_THRESHOLDS_BY_LEVEL: Record<TrainingLevel, MuscleVolumeThresholds> = {
  beginner: { mv: 4, mev: 8, mrv: 16, maxv: 20 },
  intermediate: { mv: 6, mev: 12, mrv: 22, maxv: 28 },
  advanced: { mv: 8, mev: 15, mrv: 26, maxv: 32 },
};

export function getTrainingLevel(monthsTraining: number): TrainingLevel {
  if (monthsTraining < 6) return 'beginner';
  if (monthsTraining < 36) return 'intermediate';
  return 'advanced';
}

// ---------------------------------------------------------------------------
// Per-muscle hypertrophy parameters
// ---------------------------------------------------------------------------
export interface MuscleHypertrophyParams {
  /** Human-readable display name */
  readonly name: string;
  /** Size bucket */
  readonly size: MuscleSizeCategory;

  // --- Weekly stimulus (logistic) ---
  /** Steepness of logistic curve */
  readonly weeklySteepness: number;
  /** Inflection point in sets/wk */
  readonly weeklyInflection: number;
}

export const DEFAULT_VOLUME_THRESHOLDS: MuscleVolumeThresholds = {
  mv: 6,
  mev: 13,
  mrv: 21,
  maxv: 25,
};

export function getVolumeThresholds(trainingLevel?: TrainingLevel): MuscleVolumeThresholds {
  if (trainingLevel && trainingLevel in VOLUME_THRESHOLDS_BY_LEVEL) {
    return VOLUME_THRESHOLDS_BY_LEVEL[trainingLevel];
  }
  return DEFAULT_VOLUME_THRESHOLDS;
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex2rgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const rgb2hex = (r: number, g: number, b: number) => 
    '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  
  const c1 = hex2rgb(color1);
  const c2 = hex2rgb(color2);
  return rgb2hex(
    c1.r + (c2.r - c1.r) * factor,
    c1.g + (c2.g - c1.g) * factor,
    c1.b + (c2.b - c1.b) * factor
  );
}

export function getVolumeZoneColor(sets: number, thresholds?: MuscleVolumeThresholds, maxSets?: number): string {
  const { mv, mev, mrv, maxv } = thresholds ?? DEFAULT_VOLUME_THRESHOLDS;
  
  if (sets === 0) return '#ffffff';
  
  // Wide green spectrum: white → light green → green → dark green
  const effectiveMax = maxSets ?? maxv;
  
  if (sets <= maxv) {
    // Create more granular green stops for better differentiation
    // 0-25%: white → very light green
    // 25-50%: very light green → light green  
    // 50-75%: light green → green
    // 75-100%: green → dark green
    const progress = sets / maxv;
    
    if (progress < 0.25) {
      return interpolateColor('#ffffff', '#dcfce7', progress / 0.25);
    } else if (progress < 0.5) {
      return interpolateColor('#dcfce7', '#86efac', (progress - 0.25) / 0.25);
    } else if (progress < 0.75) {
      return interpolateColor('#86efac', '#22c55e', (progress - 0.5) / 0.25);
    } else {
      return interpolateColor('#22c55e', '#15803d', (progress - 0.75) / 0.25);
    }
  }
  
  // Overdrive: yellow → orange → brown
  const overdriveProgress = Math.min((sets - maxv) / 20, 1);
  if (overdriveProgress < 0.5) {
    return interpolateColor('#fde047', '#f97316', overdriveProgress * 2);
  } else {
    return interpolateColor('#f97316', '#7c2d12', (overdriveProgress - 0.5) * 2);
  }
}

// ---------------------------------------------------------------------------
// Volume zone commentary (single source of truth)
// ---------------------------------------------------------------------------
export interface VolumeZoneInfo {
  readonly label: string;
  readonly color: string;
  readonly explanation: string;
}

export const VOLUME_ZONES: Record<string, VolumeZoneInfo> = {
  belowMV: {
    label: 'Activate',
    color: '#64748b',
    explanation: 'Minimal gains. Fine for low-priority muscles only.',
  },
  growth: {
    label: 'Stimulate',
    color: '#86efac',
    explanation: 'Steady progress. Default zone, push higher for priorities.',
  },
  optimal: {
    label: 'Amplify',
    color: '#22c55e',
    explanation: 'Best ROI. Sweet spot for muscles you care about.',
  },
  maximizing: {
    label: 'Maximize',
    color: '#15803d',
    explanation: 'High gains, high cost. Specialize 1-2 muscles only.',
  },
  high: {
    label: 'Overdrive',
    color: '#f97316',
    explanation: 'Peak week only. Poor ROI, recovery suffers.',
  },
};

export function getVolumeZone(sets: number, thresholds: MuscleVolumeThresholds): VolumeZoneInfo {
  if (sets < thresholds.mv) return VOLUME_ZONES.belowMV;
  if (sets < thresholds.mev) return VOLUME_ZONES.growth;
  if (sets < thresholds.mrv) return VOLUME_ZONES.optimal;
  if (sets < thresholds.maxv) return VOLUME_ZONES.maximizing;
  return VOLUME_ZONES.high;
}

// ---------------------------------------------------------------------------
// Per-muscle hypertrophy parameters (weekly stimulus only)
// ---------------------------------------------------------------------------
/**
 * Central muscle parameter table.
 *
 * Every headless muscle ID that appears on the body-map SVG must be present.
 * Values are tuned for psychological correctness – they should "feel right"
 * to lifters at every stage, not be biologically exact.
 */
export const MUSCLE_PARAMS: Readonly<Record<HeadlessMuscleId, MuscleHypertrophyParams>> = {
  // ── Large muscles ────────────────────────────────────────────────────
  quads: {
    name: 'Quads',
    size: 'large',
    weeklySteepness: 0.25,
    weeklyInflection: 12,
  },
  lats: {
    name: 'Lats',
    size: 'large',
    weeklySteepness: 0.25,
    weeklyInflection: 12,
  },
  glutes: {
    name: 'Glutes',
    size: 'large',
    weeklySteepness: 0.25,
    weeklyInflection: 11,
  },
  hamstrings: {
    name: 'Hamstrings',
    size: 'large',
    weeklySteepness: 0.27,
    weeklyInflection: 11,
  },
  chest: {
    name: 'Chest',
    size: 'large',
    weeklySteepness: 0.28,
    weeklyInflection: 10,
  },
    shoulders: {
    name: 'Shoulders',
    size: 'large',
    weeklySteepness: 0.30,
    weeklyInflection: 10,
  },

  // ── Medium muscles ───────────────────────────────────────────────────

  traps: {
    name: 'Traps',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 9,
  },
  triceps: {
    name: 'Triceps',
    size: 'medium',
    weeklySteepness: 0.32,
    weeklyInflection: 9,
  },
  biceps: {
    name: 'Biceps',
    size: 'medium',
    weeklySteepness: 0.32,
    weeklyInflection: 9,
  },
  abdominals: {
    name: 'Abs',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 9,
  },
  lowerback: {
    name: 'Lower Back',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 8,
  },
  adductors: {
    name: 'Adductors',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 8,
  },

  // ── Small muscles ────────────────────────────────────────────────────
  calves: {
    name: 'Calves',
    size: 'small',
    weeklySteepness: 0.35,
    weeklyInflection: 8,
  },
  forearms: {
    name: 'Forearms',
    size: 'small',
    weeklySteepness: 0.35,
    weeklyInflection: 7,
  },
  obliques: {
    name: 'Obliques',
    size: 'small',
    weeklySteepness: 0.35,
    weeklyInflection: 7,
  },
};

// Compile-time check: every headless muscle must have params
const _exhaustiveCheck: Record<HeadlessMuscleId, MuscleHypertrophyParams> = MUSCLE_PARAMS;
void _exhaustiveCheck;

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Get params for a headless muscle ID, or undefined if unknown. */
export function getMuscleParams(muscleId: string): MuscleHypertrophyParams | undefined {
  return (MUSCLE_PARAMS as Record<string, MuscleHypertrophyParams>)[muscleId];
}

/** All headless muscle IDs that have defined hypertrophy parameters. */
export const ALL_PARAM_MUSCLE_IDS: readonly HeadlessMuscleId[] = [...HEADLESS_MUSCLE_IDS];
