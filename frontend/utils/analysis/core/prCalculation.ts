import type { PrType, WorkoutSet } from '../../../types';
import { isWarmupSet } from '../classification/setClassification';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  return roundTo(weight * (1 + reps / 30), 2);
};

export interface PRTracker {
  type: PrType;
  getPreviousBest: (exercise: string) => number;
  setBest: (exercise: string, value: number) => void;
  calculateValue: (weight: number, reps: number) => number;
  getImprovement: (previous: number, current: number) => number;
}

export const createWeightTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'weight',
    getPreviousBest: (exercise: string) => map.get(exercise) ?? 0,
    setBest: (exercise: string, value: number) => map.set(exercise, value),
    calculateValue: (weight: number) => weight,
    getImprovement: (previous: number, current: number) => current - previous,
  };
};

export const createOneRmTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'oneRm',
    getPreviousBest: (exercise: string) => map.get(exercise) ?? 0,
    setBest: (exercise: string, value: number) => map.set(exercise, value),
    calculateValue: (weight: number, reps: number) => calculateOneRepMax(weight, reps),
    getImprovement: (previous: number, current: number) => roundTo(current - previous, 2),
  };
};

export const createVolumeTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'volume',
    getPreviousBest: (exercise: string) => map.get(exercise) ?? 0,
    setBest: (exercise: string, value: number) => map.set(exercise, value),
    calculateValue: (weight: number, reps: number) => weight * reps,
    getImprovement: (previous: number, current: number) => current - previous,
  };
};

export interface PRDetectionResult {
  exercise: string;
  weight: number;
  reps: number;
  date: Date;
  previousBest: number;
  improvement: number;
  type: PrType;
}

export interface PRDetectionOptions {
  timeWindowDays?: number;
  referenceDate?: Date;
}

export const detectPRsWithTrackers = (
  sortedSets: WorkoutSet[],
  trackers: PRTracker[],
  options: PRDetectionOptions = {}
): PRDetectionResult[] => {
  const { timeWindowDays, referenceDate = new Date() } = options;
  const cutoffDate = timeWindowDays 
    ? new Date(referenceDate.getTime() - timeWindowDays * MS_PER_DAY)
    : null;
  
  const prEvents: PRDetectionResult[] = [];

  for (const set of sortedSets) {
    if (isWarmupSet(set)) continue;
    
    // Skip if outside time window
    if (cutoffDate && set.parsedDate && set.parsedDate < cutoffDate) {
      continue;
    }
    
    const exercise = set.exercise_title || 'Unknown';
    const weight = set.weight_kg || 0;
    const reps = set.reps || 0;

    for (const tracker of trackers) {
      const currentValue = tracker.calculateValue(weight, reps);
      const previousBest = tracker.getPreviousBest(exercise);

      if (currentValue > 0 && currentValue > previousBest) {
        prEvents.push({
          exercise,
          weight,
          reps,
          date: set.parsedDate!,
          previousBest,
          improvement: tracker.getImprovement(previousBest, currentValue),
          type: tracker.type,
        });
        tracker.setBest(exercise, currentValue);
      }
    }
  }

  return prEvents;
};

export interface ExercisePRStatus {
  lastGoldPRDate: Date | null;
  hasRecentGoldPR: boolean;
}

export interface GoldAndSilverPRs {
  goldPRs: PRDetectionResult[];
  silverPRs: PRDetectionResult[];
  exerciseStatus: Map<string, ExercisePRStatus>;
}

export const detectGoldAndSilverPRs = (
  sortedSets: WorkoutSet[],
  silverWindowDays: number = 60,
  referenceDate: Date = new Date()
): GoldAndSilverPRs => {
  // Single pass: detect gold PRs AND track status
  const goldTrackers = createAllPRTrackers();
  const goldPRs: PRDetectionResult[] = [];
  const exerciseStatus = new Map<string, ExercisePRStatus>();
  const silverCutoff = new Date(referenceDate.getTime() - silverWindowDays * MS_PER_DAY);
  
  for (const set of sortedSets) {
    if (isWarmupSet(set)) continue;
    
    const exercise = set.exercise_title || 'Unknown';
    const weight = set.weight_kg || 0;
    const reps = set.reps || 0;
    
    // Check if this set is a gold PR
    let isGoldPR = false;
    for (const tracker of goldTrackers) {
      const currentValue = tracker.calculateValue(weight, reps);
      const previousBest = tracker.getPreviousBest(exercise);
      
      if (currentValue > 0 && currentValue > previousBest) {
        isGoldPR = true;
        goldPRs.push({
          exercise,
          weight,
          reps,
          date: set.parsedDate!,
          previousBest,
          improvement: tracker.getImprovement(previousBest, currentValue),
          type: tracker.type,
        });
        tracker.setBest(exercise, currentValue);
      }
    }
    
    // Track the last gold PR date
    if (isGoldPR && set.parsedDate) {
      const current = exerciseStatus.get(exercise);
      if (!current || !current.lastGoldPRDate || set.parsedDate > current.lastGoldPRDate) {
        exerciseStatus.set(exercise, {
          lastGoldPRDate: set.parsedDate,
          hasRecentGoldPR: set.parsedDate >= silverCutoff,
        });
      }
    }
  }
  
  // Second pass: detect silver PRs only for stale exercises
  const silverTrackers = createAllPRTrackers();
  const silverPRs: PRDetectionResult[] = [];
  
  for (const set of sortedSets) {
    if (isWarmupSet(set)) continue;
    
    // Only process sets within the silver window (last 60 days)
    if (!set.parsedDate || set.parsedDate < silverCutoff) continue;
    
    const exercise = set.exercise_title || 'Unknown';
    const status = exerciseStatus.get(exercise);
    
    // Skip if exercise has recent gold PR
    if (!status || status.hasRecentGoldPR) continue;
    
    const weight = set.weight_kg || 0;
    const reps = set.reps || 0;
    
    for (const tracker of silverTrackers) {
      const currentValue = tracker.calculateValue(weight, reps);
      const previousBest = tracker.getPreviousBest(exercise);
      
      if (currentValue > 0 && currentValue > previousBest) {
        silverPRs.push({
          exercise,
          weight,
          reps,
          date: set.parsedDate!,
          previousBest,
          improvement: tracker.getImprovement(previousBest, currentValue),
          type: tracker.type,
        });
        tracker.setBest(exercise, currentValue);
      }
    }
  }
  
  return {
    goldPRs,
    silverPRs,
    exerciseStatus,
  };
};

export const sortSetsChronologically = (sets: WorkoutSet[]): WorkoutSet[] => {
  return [...sets]
    .filter((s) => s.parsedDate && !isWarmupSet(s) && (s.weight_kg || 0) > 0)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const dt = (a.s.parsedDate!.getTime() || 0) - (b.s.parsedDate!.getTime() || 0);
      if (dt !== 0) return dt;
      return a.i - b.i;
    })
    .map(({ s }) => s);
};

export const createAllPRTrackers = (): PRTracker[] => [
  createWeightTracker(),
  createOneRmTracker(),
  createVolumeTracker(),
];
