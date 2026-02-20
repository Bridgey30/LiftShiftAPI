import type { TrainingLevel } from '../muscle/hypertrophy/muscleParams';

// ---------------------------------------------------------------------------
// Shared Tier System
// 
// 9 tiers with diminishing returns built into the positions:
// 0% → 2% (easy), 2% → 4% (easy), ... 55% → 100% (hard)
// ---------------------------------------------------------------------------

export interface TierDef {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly phase: TrainingLevel;
  readonly positionPercent: number;
  readonly color: string;
  readonly hexColor: string;
}

export const JOURNEY_TIERS: readonly TierDef[] = [
  // ── Beginner phase ────────────────────────────────────────────────────────
  {
    key: 'seedling',
    label: 'Seedling',
    description: 'Just getting started. Focus on learning movements and building the habit.',
    phase: 'beginner',
    positionPercent: 0,
    color: 'text-emerald-300',
    hexColor: '#6ee7b7',
  },
  {
    key: 'sprout',
    label: 'Sprout',
    description: 'You have a workout routine. Keep showing up consistently.',
    phase: 'beginner',
    positionPercent: 2,
    color: 'text-emerald-400',
    hexColor: '#34d399',
  },
  {
    key: 'sapling',
    label: 'Sapling',
    description: 'You train regularly. Now focus on progressive overload.',
    phase: 'beginner',
    positionPercent: 4,
    color: 'text-teal-400',
    hexColor: '#2dd4bf',
  },

  // ── Intermediate phase ──────────────────────────────────────────────────
  {
    key: 'foundation',
    label: 'Foundation',
    description: 'You have solid fundamentals. Time to build muscle mass.',
    phase: 'intermediate',
    positionPercent: 7,
    color: 'text-cyan-400',
    hexColor: '#22d3ee',
  },
  {
    key: 'builder',
    label: 'Builder',
    description: 'Noticeable muscle growth. Push for progressive overload.',
    phase: 'intermediate',
    positionPercent: 14,
    color: 'text-emerald-400',
    hexColor: '#34d399',
  },
  {
    key: 'sculptor',
    label: 'Sculptor',
    description: 'Significant muscle development. Refine your physique.',
    phase: 'intermediate',
    positionPercent: 25,
    color: 'text-lime-400',
    hexColor: '#a3e635',
  },

  // ── Advanced phase ────────────────────────────────────────────────────────
  {
    key: 'elite',
    label: 'Elite',
    description: 'Impressive dedication. Fine-tune your training and nutrition.',
    phase: 'advanced',
    positionPercent: 35,
    color: 'text-amber-400',
    hexColor: '#fbbf24',
  },
  {
    key: 'master',
    label: 'Master',
    description: 'Elite-level dedication. Maintain and refine your masterpiece.',
    phase: 'advanced',
    positionPercent: 55,
    color: 'text-orange-400',
    hexColor: '#fb923c',
  },
  {
    key: 'legend',
    label: 'Legend',
    description: 'The pinnacle of fitness dedication. You have earned your legacy.',
    phase: 'advanced',
    positionPercent: 100,
    color: 'text-red-400',
    hexColor: '#f87171',
  },
];

// ---------------------------------------------------------------------------
// Achievement calculation with diminishing returns
// ---------------------------------------------------------------------------

/**
 * Calculate achievement % from lifetime sets using diminishing returns.
 * Formula: (sets / (sets + halfLife)) * 100
 * 
 * At 500 sets: ~9%
 * At 2000 sets: ~29%
 * At 5000 sets: ~50%
 * At 15000 sets: ~75%
 * At 50000 sets: ~91%
 * 
 * @param lifetimeSets Total lifetime sets for this muscle
 * @param halfLife Sets at which 50% of max achievement is reached (default 5000)
 */
export function calculateAchievement(lifetimeSets: number, halfLife: number = 5000): number {
  const achievement = (lifetimeSets / (lifetimeSets + halfLife)) * 100;
  return Math.round(achievement * 10) / 10;
}

/**
 * Find the current tier based on achievement percentage.
 */
export function findTierByAchievement(achievementPercent: number): TierDef {
  const rounded = Math.round(achievementPercent);
  let currentTier = JOURNEY_TIERS[0];
  for (const tier of JOURNEY_TIERS) {
    if (rounded >= tier.positionPercent) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier;
}

/**
 * Calculate progress to next tier (0-100).
 */
export function calculateProgressToNextTier(achievementPercent: number): number {
  const currentTier = findTierByAchievement(achievementPercent);
  const currentIdx = JOURNEY_TIERS.findIndex(t => t.key === currentTier.key);
  
  if (currentIdx >= JOURNEY_TIERS.length - 1) return 100;
  
  const nextTier = JOURNEY_TIERS[currentIdx + 1];
  const range = nextTier.positionPercent - currentTier.positionPercent;
  const progress = achievementPercent - currentTier.positionPercent;
  
  return Math.min(100, Math.round((progress / range) * 100));
}

/**
 * Get next tier info.
 */
export function getNextTier(achievementPercent: number): TierDef | null {
  const currentTier = findTierByAchievement(achievementPercent);
  const currentIdx = JOURNEY_TIERS.findIndex(t => t.key === currentTier.key);
  
  if (currentIdx >= JOURNEY_TIERS.length - 1) return null;
  return JOURNEY_TIERS[currentIdx + 1];
}

/**
 * Estimate weeks to reach next tier based on weekly sets.
 */
export function estimateWeeksToNextTier(
  achievementPercent: number,
  weeklySets: number,
  halfLife: number = 5000
): number | null {
  const nextTier = getNextTier(achievementPercent);
  if (!nextTier) return null;
  
  const currentSets = (achievementPercent / 100) * halfLife / (1 - achievementPercent / 100);
  const targetSets = (nextTier.positionPercent / 100) * halfLife / (1 - nextTier.positionPercent / 100);
  const remainingSets = Math.max(0, targetSets - currentSets);
  
  if (weeklySets <= 0) return null;
  return Math.ceil(remainingSets / weeklySets);
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getTierColor(key: string): string {
  const tier = JOURNEY_TIERS.find(t => t.key === key);
  return tier?.hexColor ?? '#94a3b8';
}

export function getTierByKey(key: string): TierDef | undefined {
  return JOURNEY_TIERS.find(t => t.key === key);
}
