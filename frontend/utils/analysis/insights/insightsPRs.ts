import { differenceInDays, subDays } from 'date-fns';
import { WorkoutSet } from '../../../types';
import {
  PRDetectionResult,
  detectGoldAndSilverPRs,
  sortSetsChronologically,
} from '../core/prCalculation';

export type RecentPR = PRDetectionResult & { isSilver?: boolean };

export interface PRInsights {
  daysSinceLastPR: number;
  lastPRDate: Date | null;
  lastPRExercise: string | null;
  prDrought: boolean;
  recentPRs: RecentPR[];
  prFrequency: number;
  totalPRs: number;
  totalSilverPRs: number;
  recentSilverPRs: RecentPR[];
}

const SILVER_PR_WINDOW_DAYS = 60;

const PR_TYPE_PRIORITY: Record<string, number> = {
  weight: 3,
  oneRm: 2,
  volume: 1,
};

const getPriority = (pr: RecentPR): number => {
  if (pr.isSilver) return 0;
  return PR_TYPE_PRIORITY[pr.type] ?? 0;
};

export const calculatePRInsights = (data: WorkoutSet[], now: Date = new Date(0)): PRInsights => {
  const sorted = sortSetsChronologically(data);

  if (sorted.length === 0) {
    return {
      daysSinceLastPR: 0,
      lastPRDate: null,
      lastPRExercise: null,
      prDrought: false,
      recentPRs: [],
      prFrequency: 0,
      totalPRs: 0,
      totalSilverPRs: 0,
      recentSilverPRs: [],
    };
  }

  const { goldPRs, silverPRs } = detectGoldAndSilverPRs(sorted, SILVER_PR_WINDOW_DAYS, now);

  const lastGoldPR = goldPRs[goldPRs.length - 1];
  const daysSinceLastPR = lastGoldPR ? differenceInDays(now, lastGoldPR.date) : 0;

  const recentGoldPRs: RecentPR[] = goldPRs.slice(-5).reverse().map(pr => ({ ...pr, isSilver: false }));
  const recentSilverPRs: RecentPR[] = silverPRs.slice(-3).reverse().map(pr => ({ ...pr, isSilver: true }));
  
  const allRecent: RecentPR[] = [...recentGoldPRs, ...recentSilverPRs];
  
  const deduped = allRecent.reduce<RecentPR[]>((acc, pr) => {
    const existing = acc.find(p => p.exercise === pr.exercise);
    if (!existing) {
      acc.push(pr);
    } else if (getPriority(pr) > getPriority(existing)) {
      const idx = acc.indexOf(existing);
      acc[idx] = pr;
    }
    return acc;
  }, []);

  const recentPRs = deduped.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  const thirtyDaysAgo = subDays(now, 30);
  const recentGoldCount = goldPRs.filter((pr) => pr.date >= thirtyDaysAgo).length;
  const prFrequency = Math.round((recentGoldCount / 4) * 10) / 10;

  return {
    daysSinceLastPR,
    lastPRDate: lastGoldPR?.date ?? null,
    lastPRExercise: lastGoldPR?.exercise ?? null,
    prDrought: daysSinceLastPR > 14,
    recentPRs,
    prFrequency,
    totalPRs: goldPRs.length,
    totalSilverPRs: silverPRs.length,
    recentSilverPRs,
  };
};
