import type { PrType, WorkoutSet } from '../../../types';
import { getDateKey, type TimePeriod, sortByTimestamp } from '../../date/dateUtils';
import { isWarmupSet } from '../classification/setClassification';
import {
  PRTracker,
  createWeightTracker,
  createOneRmTracker,
  createVolumeTracker,
  roundTo,
  detectGoldAndSilverPRs,
  sortSetsChronologically,
  PRDetectionResult,
} from './prCalculation';

const sortByParsedDate = (sets: WorkoutSet[], ascending: boolean): WorkoutSet[] => {
  const sign = ascending ? 1 : -1;
  return [...sets]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const timeA = a.s.parsedDate?.getTime() ?? 0;
      const timeB = b.s.parsedDate?.getTime() ?? 0;
      const dt = timeA - timeB;
      if (dt !== 0) return dt * sign;

      const siA = a.s.set_index ?? 0;
      const siB = b.s.set_index ?? 0;
      const dsi = siA - siB;
      if (dsi !== 0) return dsi * sign;

      return (a.i - b.i) * sign;
    })
    .map((x) => x.s);
};

const calculateOneRepMax = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  return roundTo(weight * (1 + reps / 30), 2);
};

export interface PRTypeFlags {
  isWeightPr: boolean;
  isOneRmPr: boolean;
  isVolumePr: boolean;
}

const SILVER_PR_WINDOW_DAYS = 60;

interface PRMatchKey {
  exercise: string;
  timestamp: number;
  weight: number;
  reps: number;
}

const createPRMatchKey = (pr: { exercise: string; date: Date; weight: number; reps: number }): PRMatchKey => ({
  exercise: pr.exercise,
  timestamp: pr.date.getTime(),
  weight: pr.weight,
  reps: pr.reps,
});

const prMatchesSet = (key: PRMatchKey, set: WorkoutSet): boolean => {
  if (!set.parsedDate) return false;
  return (
    key.exercise === set.exercise_title &&
    key.timestamp === set.parsedDate.getTime() &&
    key.weight === set.weight_kg &&
    key.reps === set.reps
  );
};

export const identifyPersonalRecords = (data: WorkoutSet[], referenceDate?: Date): WorkoutSet[] => {
  const sorted = sortByParsedDate(data, true);
  
  // Calculate reference date from data if not provided
  // Use latest date in dataset, not actual current date
  const effectiveReferenceDate = referenceDate ?? (() => {
    let maxTs = -Infinity;
    for (const set of data) {
      if (set.parsedDate) {
        const ts = set.parsedDate.getTime();
        if (Number.isFinite(ts) && ts > maxTs) {
          maxTs = ts;
        }
      }
    }
    return Number.isFinite(maxTs) ? new Date(maxTs) : new Date();
  })();
  
  // Use centralized detection for both gold and silver PRs
  const { goldPRs, silverPRs } = detectGoldAndSilverPRs(
    sorted,
    SILVER_PR_WINDOW_DAYS,
    effectiveReferenceDate
  );
  
  // Create lookup maps using object pooling for efficiency
  const goldPRMap = new Map<number, PrType[]>();
  const silverPRMap = new Map<number, PrType[]>();
  
  // Build index of PRs by set index for O(1) lookup
  for (let i = 0; i < sorted.length; i++) {
    const set = sorted[i];
    if (!set.parsedDate || isWarmupSet(set)) continue;
    
    // Check for gold PR match
    const goldTypes: PrType[] = [];
    for (const pr of goldPRs) {
      if (prMatchesSet(createPRMatchKey(pr), set)) {
        goldTypes.push(pr.type);
      }
    }
    if (goldTypes.length > 0) {
      goldPRMap.set(i, goldTypes);
    }
    
    // Check for silver PR match
    const silverTypes: PrType[] = [];
    for (const pr of silverPRs) {
      if (prMatchesSet(createPRMatchKey(pr), set)) {
        silverTypes.push(pr.type);
      }
    }
    if (silverTypes.length > 0) {
      silverPRMap.set(i, silverTypes);
    }
  }
  
  // Map PRs back to sets
  return sortByParsedDate(sorted, false).map((set, index) => {
    const originalIndex = sorted.indexOf(set);
    const prTypes = goldPRMap.get(originalIndex) ?? [];
    const silverPrTypes = silverPRMap.get(originalIndex) ?? [];
    
    return {
      ...set,
      isPr: prTypes.length > 0,
      prTypes,
      isSilverPr: silverPrTypes.length > 0,
      silverPrTypes,
    };
  });
};

export const getPrTypeFlags = (prTypes?: PrType[]): PRTypeFlags => {
  return {
    isWeightPr: prTypes?.includes('weight') ?? false,
    isOneRmPr: prTypes?.includes('oneRm') ?? false,
    isVolumePr: prTypes?.includes('volume') ?? false,
  };
};

export interface PRTimeEntry {
  count: number;
  timestamp: number;
  dateFormatted: string;
}

export const getPrsOverTime = (
  data: WorkoutSet[],
  mode: 'daily' | 'weekly' | 'monthly' = 'monthly'
): PRTimeEntry[] => {
  const period: TimePeriod = mode === 'monthly' ? 'monthly' : (mode === 'weekly' ? 'weekly' : 'daily');
  const grouped = new Map<string, PRTimeEntry>();

  for (const set of data) {
    if (!set.parsedDate || !set.isPr) continue;
    if (isWarmupSet(set)) continue;

    const { key, timestamp, label } = getDateKey(set.parsedDate, period);

    let entry = grouped.get(key);
    if (!entry) {
      entry = { count: 0, timestamp, dateFormatted: label };
      grouped.set(key, entry);
    }
    entry.count += 1;
  }

  return sortByTimestamp(Array.from(grouped.values()));
};
