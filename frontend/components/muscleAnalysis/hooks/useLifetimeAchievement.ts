import { useMemo } from 'react';
import { calculateAchievement, findTierByAchievement, JOURNEY_TIERS } from '../../../utils/training/tierUtils';
import type { HeadlessMuscleId } from '../../../utils/muscle/mapping/muscleHeadless';

interface LifetimeAchievementEntry {
  muscleId: string;
  name: string;
  lifetimeSets: number;
  weeklySets: number;
  achievement: number;
  tier: typeof JOURNEY_TIERS[0];
}

export interface LifetimeAchievementData {
  overallPercent: number;
  overallTier: { key: string; label: string; description: string; color: string; hexColor: string };
  muscles: LifetimeAchievementEntry[];
  contextPercent: number;
  contextTier: { key: string; label: string; description: string; color: string; hexColor: string };
  contextLabel: string;
  totalLifetimeSets: number;
}

interface UseLifetimeAchievementParams {
  lifetimeHeadlessVolumes: ReadonlyMap<string, number>;
  weeklyHeadlessVolumes?: ReadonlyMap<string, number>;
  selectedMuscle: string | null;
}

/**
 * Computes lifetime hypertrophy achievement data for the current selection context.
 */
export function useLifetimeAchievement({
  lifetimeHeadlessVolumes,
  weeklyHeadlessVolumes,
  selectedMuscle,
}: UseLifetimeAchievementParams): LifetimeAchievementData {
  return useMemo(() => {
    // Calculate per-muscle achievements using new simplified formula
    const muscles: LifetimeAchievementEntry[] = [];
    let totalLifetimeSets = 0;

    for (const [muscleId, lifetimeSets] of lifetimeHeadlessVolumes) {
      const weeklySets = weeklyHeadlessVolumes?.get(muscleId) ?? 0;
      const achievement = calculateAchievement(lifetimeSets);
      const tier = findTierByAchievement(achievement);

      totalLifetimeSets += lifetimeSets;

      muscles.push({
        muscleId,
        name: muscleId.charAt(0).toUpperCase() + muscleId.slice(1),
        lifetimeSets,
        weeklySets,
        achievement,
        tier,
      });
    }

    // Sort by achievement (highest first)
    muscles.sort((a, b) => b.achievement - a.achievement);

    // Calculate overall from top 10 muscles only
    const overallPercent = muscles.length > 0
      ? muscles.slice(0, 10).reduce((sum, m) => sum + m.achievement, 0) / Math.min(muscles.length, 10)
      : 0;
    const overallTier = findTierByAchievement(overallPercent);

    totalLifetimeSets = Math.round(totalLifetimeSets * 10) / 10;

    // No selection → show overall
    if (!selectedMuscle) {
      return {
        overallPercent,
        overallTier,
        muscles,
        contextPercent: overallPercent,
        contextTier: overallTier,
        contextLabel: 'Overall',
        totalLifetimeSets,
      };
    }

    // Muscle selected → direct lookup
    const entry = muscles.find((m) => m.muscleId === selectedMuscle);
    if (entry) {
      return {
        overallPercent,
        overallTier,
        muscles,
        contextPercent: entry.achievement,
        contextTier: entry.tier,
        contextLabel: entry.name,
        totalLifetimeSets,
      };
    }

    // Fallback → overall
    return {
      overallPercent,
      overallTier,
      muscles,
      contextPercent: overallPercent,
      contextTier: overallTier,
      contextLabel: 'Overall',
      totalLifetimeSets,
    };
  }, [lifetimeHeadlessVolumes, selectedMuscle, weeklyHeadlessVolumes]);
}
