import type { MuscleId } from '../mapping/muscleIds';
import { MUSCLE_IDS } from '../mapping/muscleIds';

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
  
  if (sets === 0) return '#ffffffbb';
  
  // Wide green spectrum: white → light green → green → dark green
  const effectiveMax = maxSets ?? maxv;
  
if (sets <= maxv) {
    const progress = sets / maxv;

    if (progress < 0.15) {
        // 0–15%: white → light green (slightly lighter than #22c55e)
        return interpolateColor('#deebe3', '#4ade80', progress / 0.15);
    } else if (progress < 0.3) {
        // 15–30%: light green → base green
        return interpolateColor('#4ade80', '#22c55e', (progress - 0.15) / 0.15);
    } else if (progress < 0.45) {
        // 30–45%: base → medium-dark
        return interpolateColor('#22c55e', '#16a34a', (progress - 0.3) / 0.15);
    } else if (progress < 0.6) {
        // 45–60%: medium-dark → deep green
        return interpolateColor('#16a34a', '#15803d', (progress - 0.45) / 0.15);
    } else if (progress < 0.75) {
        // 60–75%: deep → forest
        return interpolateColor('#15803d', '#166534', (progress - 0.6) / 0.15);
    } else if (progress < 0.9) {
        // 75–90%: forest → dark forest
        return interpolateColor('#166534', '#14532d', (progress - 0.75) / 0.15);
    } else {
        // 90–100%: dark forest → very dark (#0f3d22)
        return interpolateColor('#14532d', '#0f3d22', (progress - 0.9) / 0.1);
    }
}

// Overreaching: yellow → orange → brown
const overreachingProgress = Math.min((sets - maxv) / 20, 1);
if (overreachingProgress < 0.5) {
    return interpolateColor('#fde047', '#f97316', overreachingProgress * 2);
} else {
    return interpolateColor('#f97316', '#7c2d12', (overreachingProgress - 0.5) * 2);
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
    label: 'Activating',
    color: '#64748b',
    explanation: 'Minimal gains. Fine for low-priority muscles only.',
  },
  growth: {
    label: 'Stimulating',
    color: '#86efac',
    explanation: 'Steady progress. Default zone, push higher for priorities.',
  },
  optimal: {
    label: 'Amplifying',
    color: '#22c55e',
    explanation: 'Best ROI. Sweet spot for muscles you care about.',
  },
  maximizing: {
    label: 'Maximizing',
    color: '#15803d',
    explanation: 'High gains, high cost. Specialize 1-2 muscles only.',
  },
  high: {
    label: 'Overreaching',
    color: '#f97316',
    explanation: 'Peak week only. Poor ROI, recovery suffers.',
  },
};

export function getVolumeZone(sets: number, thresholds: MuscleVolumeThresholds): VolumeZoneInfo {
  if (sets < thresholds.mv) return VOLUME_ZONES.belowMV;
  if (sets < thresholds.mev) return VOLUME_ZONES.growth;
  if (sets < thresholds.mrv) return VOLUME_ZONES.optimal;
  if (sets <= thresholds.maxv) return VOLUME_ZONES.maximizing;
  return VOLUME_ZONES.high;
}

// ---------------------------------------------------------------------------
// Per-muscle hypertrophy parameters
// ---------------------------------------------------------------------------
/**
 * Central muscle parameter table.
 *
 * Every muscle ID that appears on the body-map SVG must be present.
 * Values are tuned for psychological correctness – they should "feel right"
 * to lifters at every stage, not be biologically exact.
 */
export const MUSCLE_PARAMS: Readonly<Record<MuscleId, MuscleHypertrophyParams>> = {
  // ── Large muscles ────────────────────────────────────────────────────
  quads: {
    name: 'Quads',
    size: 'large',
  },
  lats: {
    name: 'Lats',
    size: 'large',
  },
  glutes: {
    name: 'Glutes',
    size: 'large',
  },
  hamstrings: {
    name: 'Hamstrings',
    size: 'large',
  },
  chest: {
    name: 'Chest',
    size: 'large',
  },
  shoulders: {
    name: 'Shoulders',
    size: 'large',
  },

  // ── Medium muscles ───────────────────────────────────────────────────

  traps: {
    name: 'Traps',
    size: 'medium',
  },
  triceps: {
    name: 'Triceps',
    size: 'medium',
  },
  biceps: {
    name: 'Biceps',
    size: 'medium',
  },
  abdominals: {
    name: 'Abs',
    size: 'medium',
  },
  lowerback: {
    name: 'Lower Back',
    size: 'medium',
  },
  adductors: {
    name: 'Adductors',
    size: 'medium',
  },
  abductors: {
    name: 'Abductors',
    size: 'medium',
  },
  neck: {
    name: 'Neck',
    size: 'small',
  },

  // ── Small muscles ────────────────────────────────────────────────────
  calves: {
    name: 'Calves',
    size: 'small',
  },
  forearms: {
    name: 'Forearms',
    size: 'small',
  },
  obliques: {
    name: 'Obliques',
    size: 'small',
  },
};

// Compile-time check: every muscle must have params
const _exhaustiveCheck: Record<MuscleId, MuscleHypertrophyParams> = MUSCLE_PARAMS;
void _exhaustiveCheck;

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Get params for a muscle ID, or undefined if unknown. */
export function getMuscleParams(muscleId: string): MuscleHypertrophyParams | undefined {
  return (MUSCLE_PARAMS as Record<string, MuscleHypertrophyParams>)[muscleId];
}

/** All muscle IDs that have defined hypertrophy parameters. */
export const ALL_PARAM_MUSCLE_IDS: readonly MuscleId[] = [...MUSCLE_IDS];
