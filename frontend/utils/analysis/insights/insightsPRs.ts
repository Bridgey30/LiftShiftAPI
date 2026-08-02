import { differenceInDays, subDays } from 'date-fns';
import { WorkoutSet } from '../../../types';
import {
  PRDetectionResult,
  PR_PRIORITY,
  detectGoldAndSilverPRs,
  sortSetsChronologically,
  isMoreImportantPR,
} from '../core/prCalculation';
import { getLoadProgressionDirection } from '../../exercise/loadProgression';

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

const SILVER_PR_WINDOW_DAYS = 30;

const normalizeDisplayImprovement = (pr: RecentPR): RecentPR => {
  const isLowerWeightBetter = getLoadProgressionDirection(pr.exercise) === 'lower';
  if (!isLowerWeightBetter) return pr;
  return {
    ...pr,
    improvement: Math.abs(pr.improvement),
  };
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

  // goldPRs is grouped by tracker type, not globally chronological — pick the newest by date.
  const lastGoldPR = goldPRs.reduce<PRDetectionResult | null>(
    (best, pr) => (best === null || pr.date > best.date ? pr : best),
    null
  );
  const daysSinceLastPR = lastGoldPR ? differenceInDays(now, lastGoldPR.date) : 0;

  const recentGoldPRs: RecentPR[] = goldPRs.map((pr) =>
    normalizeDisplayImprovement({ ...pr, isSilver: false })
  );

  const recentSilverPRs: RecentPR[] = silverPRs.map((pr) =>
    normalizeDisplayImprovement({ ...pr, isSilver: true })
  );

  // Per exercise + session (date), keep only the single most important PR
  // (tier first: gold over silver, then type priority). No duplicate entries.
  const bestByExerciseSession = new Map<string, RecentPR>();
  for (const pr of [...recentSilverPRs, ...recentGoldPRs]) {
    const key = `${pr.exercise}::${pr.date.getTime()}`;
    const existing = bestByExerciseSession.get(key);
    if (!existing || isMoreImportantPR(pr, existing)) {
      bestByExerciseSession.set(key, pr);
    }
  }

  const sortedByDate = Array.from(bestByExerciseSession.values()).sort((a, b) => {
    const dt = b.date.getTime() - a.date.getTime();
    if (dt !== 0) return dt;
    // Within the same session, gold entries sit leftmost, then silver.
    const tierDiff = (a.isSilver ? 1 : 0) - (b.isSilver ? 1 : 0);
    if (tierDiff !== 0) return tierDiff;
    // Within the same tier, the most important type comes first.
    return PR_PRIORITY[a.type] - PR_PRIORITY[b.type];
  });

  // Always show every PR from the newest session in full, then top up with older PRs.
  const newestTs = sortedByDate[0]?.date.getTime() ?? 0;
  const newestSession = sortedByDate.filter((p) => p.date.getTime() === newestTs);
  const older = sortedByDate.filter((p) => p.date.getTime() !== newestTs);
  const topUp = Math.max(0, 7 - newestSession.length);
  const recentPRs = [...newestSession, ...older.slice(0, topUp)];

  const thirtyDaysAgo = subDays(now, 30);
  const recentGoldCount = goldPRs.filter((pr) => pr.date >= thirtyDaysAgo).length;
  const prFrequency = Math.round((recentGoldCount / (30 / 7)) * 10) / 10;

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
