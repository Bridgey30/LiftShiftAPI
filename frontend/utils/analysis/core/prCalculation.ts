import type { PrType, WorkoutSet } from '../../../types';
import { isWarmupSet } from '../classification/setClassification';
import { getLoadProgressionDirection } from '../../exercise/loadProgression';
import { getSessionKey } from '../../date/dateKeys';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  return roundTo(weight * (1 + reps / 30), 2);
};

/** A single candidate event fed to a PR tracker. For session-granularity
 * trackers, weight/reps carry the session aggregates. */
export interface PREvent {
  exercise: string;
  weight: number;
  reps: number;
  date: Date;
}

/**
 * A PR tracker owns everything needed to detect a personal record:
 * which events it consumes, its comparison key, its value formula and
 * its improvement metric. Tracker instances hold per-key bests, so create
 * fresh instances per pass.
 */
export interface PRTracker {
  type: PrType;
  /** 'set' trackers evaluate individual working sets; 'session' trackers evaluate per-workout aggregates */
  granularity: 'set' | 'session';
  buildEvents: (sets: WorkoutSet[]) => PREvent[];
  getKey: (event: PREvent) => string;
  getPreviousBest: (key: string) => number;
  setBest: (key: string, value: number) => void;
  calculateValue: (event: PREvent) => number;
  isBetter: (event: PREvent, current: number, previous: number) => boolean;
  getImprovement: (event: PREvent, previous: number, current: number) => number;
}

const buildSetEvents = (sets: WorkoutSet[]): PREvent[] => {
  const events: PREvent[] = [];
  for (const set of sets) {
    if (isWarmupSet(set) || !set.parsedDate) continue;
    // Distance-based sets (cardio, rowing) carry no meaningful rep/load PR signal.
    if ((set.distance_km || 0) > 0) continue;
    events.push({
      exercise: set.exercise_title || 'Unknown',
      weight: set.weight_kg || 0,
      reps: set.reps || 0,
      date: set.parsedDate,
    });
  }
  return events;
};

const buildSessionEvents = (
  sets: WorkoutSet[],
  pick: (set: WorkoutSet) => { weight: number; reps: number }
): PREvent[] => {
  const sessions = new Map<string, PREvent>();
  for (const set of sets) {
    if (isWarmupSet(set) || !set.parsedDate) continue;
    const exercise = set.exercise_title || 'Unknown';
    const key = `${getSessionKey(set)}::${exercise}`;
    const picked = pick(set);
    const existing = sessions.get(key);
    if (existing) {
      existing.weight += picked.weight;
      existing.reps += picked.reps;
    } else {
      sessions.set(key, { exercise, weight: picked.weight, reps: picked.reps, date: set.parsedDate });
    }
  }
  return Array.from(sessions.values());
};

const isHigherBetter = (current: number, previous: number): boolean => {
  if (current <= 0 || !Number.isFinite(current)) return false;
  if (previous <= 0 || !Number.isFinite(previous)) return true;
  return current > previous;
};

const isDirectionAwareBetter = (exercise: string, current: number, previous: number): boolean => {
  if (current <= 0 || !Number.isFinite(current)) return false;
  if (previous <= 0 || !Number.isFinite(previous)) return true;
  const isLowerWeightBetter = getLoadProgressionDirection(exercise) === 'lower';
  return isLowerWeightBetter ? current < previous : current > previous;
};

export const createWeightTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'weight',
    granularity: 'set',
    buildEvents: buildSetEvents,
    getKey: (event) => event.exercise,
    getPreviousBest: (key) => map.get(key) ?? 0,
    setBest: (key, value) => map.set(key, value),
    calculateValue: (event) => event.weight,
    isBetter: (event, current, previous) => isDirectionAwareBetter(event.exercise, current, previous),
    getImprovement: (event, previous, current) => {
      const isLowerWeightBetter = getLoadProgressionDirection(event.exercise) === 'lower';
      return roundTo(isLowerWeightBetter ? previous - current : current - previous, 2);
    },
  };
};

export const createOneRmTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'oneRm',
    granularity: 'set',
    buildEvents: buildSetEvents,
    getKey: (event) => event.exercise,
    getPreviousBest: (key) => map.get(key) ?? 0,
    setBest: (key, value) => map.set(key, value),
    calculateValue: (event) => calculateOneRepMax(event.weight, event.reps),
    isBetter: (event, current, previous) => isDirectionAwareBetter(event.exercise, current, previous),
    getImprovement: (event, previous, current) => {
      const isLowerWeightBetter = getLoadProgressionDirection(event.exercise) === 'lower';
      return roundTo(isLowerWeightBetter ? previous - current : current - previous, 2);
    },
  };
};

export const createVolumeTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'volume',
    granularity: 'set',
    buildEvents: buildSetEvents,
    getKey: (event) => event.exercise,
    getPreviousBest: (key) => map.get(key) ?? 0,
    setBest: (key, value) => map.set(key, value),
    calculateValue: (event) => event.weight * event.reps,
    isBetter: (event, current, previous) => isDirectionAwareBetter(event.exercise, current, previous),
    getImprovement: (event, previous, current) => {
      const isLowerWeightBetter = getLoadProgressionDirection(event.exercise) === 'lower';
      return roundTo(isLowerWeightBetter ? previous - current : current - previous, 2);
    },
  };
};

/** Most reps in a single working set, regardless of weight (bodyweight friendly). */
export const createRepsTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'reps',
    granularity: 'set',
    buildEvents: buildSetEvents,
    getKey: (event) => event.exercise,
    getPreviousBest: (key) => map.get(key) ?? 0,
    setBest: (key, value) => map.set(key, value),
    calculateValue: (event) => event.reps,
    isBetter: (_event, current, previous) => isHigherBetter(current, previous),
    getImprovement: (_event, previous, current) => roundTo(current - previous, 0),
  };
};

/** Most reps ever performed at an exercise's exact weight. */
export const createWeightedRepsTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'weightedReps',
    granularity: 'set',
    buildEvents: buildSetEvents,
    getKey: (event) => `${event.exercise}::${event.weight}`,
    getPreviousBest: (key) => map.get(key) ?? 0,
    setBest: (key, value) => map.set(key, value),
    calculateValue: (event) => event.reps,
    isBetter: (_event, current, previous) => isHigherBetter(current, previous),
    getImprovement: (_event, previous, current) => roundTo(current - previous, 0),
  };
};

/** Total tonnage (kg x reps) for an exercise across a single workout session. */
export const createSessionVolumeTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'sessionVolume',
    granularity: 'session',
    buildEvents: (sets) =>
      buildSessionEvents(sets, (set) => ({ weight: (set.weight_kg || 0) * (set.reps || 0), reps: set.reps || 0 })),
    getKey: (event) => event.exercise,
    getPreviousBest: (key) => map.get(key) ?? 0,
    setBest: (key, value) => map.set(key, value),
    calculateValue: (event) => event.weight,
    isBetter: (_event, current, previous) => isHigherBetter(current, previous),
    getImprovement: (_event, previous, current) => roundTo(current - previous, 2),
  };
};

/** Total distance covered for an exercise across a single workout session. */
export const createDistanceTracker = (): PRTracker => {
  const map = new Map<string, number>();
  return {
    type: 'distance',
    granularity: 'session',
    buildEvents: (sets) =>
      buildSessionEvents(sets, (set) => ({ weight: set.distance_km || 0, reps: set.reps || 0 })),
    getKey: (event) => event.exercise,
    getPreviousBest: (key) => map.get(key) ?? 0,
    setBest: (key, value) => map.set(key, value),
    calculateValue: (event) => event.weight,
    isBetter: (_event, current, previous) => isHigherBetter(current, previous),
    getImprovement: (_event, previous, current) => roundTo(current - previous, 2),
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
  granularity: 'set' | 'session';
}

export interface PRDetectionOptions {
  timeWindowDays?: number;
  referenceDate?: Date;
}

const makeResult = (tracker: PRTracker, event: PREvent, previous: number, current: number): PRDetectionResult => ({
  exercise: event.exercise,
  weight: event.weight,
  reps: event.reps,
  date: event.date,
  previousBest: previous,
  improvement: tracker.getImprovement(event, previous, current),
  type: tracker.type,
  granularity: tracker.granularity,
});

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

  for (const tracker of trackers) {
    const events = tracker.buildEvents(sortedSets);
    for (const event of events) {
      if (cutoffDate && event.date < cutoffDate) continue;
      const key = tracker.getKey(event);
      const currentValue = tracker.calculateValue(event);
      const previousBest = tracker.getPreviousBest(key);

      if (tracker.isBetter(event, currentValue, previousBest)) {
        prEvents.push(makeResult(tracker, event, previousBest, currentValue));
        tracker.setBest(key, currentValue);
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
  silverWindowDays: number = 30,
  referenceDate: Date = new Date()
): GoldAndSilverPRs => {
  const goldPRs: PRDetectionResult[] = [];
  const silverPRs: PRDetectionResult[] = [];
  const exerciseStatus = new Map<string, ExercisePRStatus>();
  // Latest gold date per tracker kind + key (per-kind staleness for the silver pass).
  const lastGoldByKey = new Map<string, Date>();
  const silverCutoff = new Date(referenceDate.getTime() - silverWindowDays * MS_PER_DAY);

  // First pass: detect gold PRs AND track the last gold PR date per exercise and per key.
  for (const tracker of createAllPRTrackers()) {
    const events = tracker.buildEvents(sortedSets);
    for (const event of events) {
      const key = `${tracker.type}::${tracker.getKey(event)}`;
      const currentValue = tracker.calculateValue(event);
      const previousBest = tracker.getPreviousBest(key);

      if (tracker.isBetter(event, currentValue, previousBest)) {
        goldPRs.push(makeResult(tracker, event, previousBest, currentValue));
        tracker.setBest(key, currentValue);

        const current = exerciseStatus.get(event.exercise);
        if (!current || !current.lastGoldPRDate || event.date > current.lastGoldPRDate) {
          exerciseStatus.set(event.exercise, {
            lastGoldPRDate: event.date,
            hasRecentGoldPR: event.date >= silverCutoff,
          });
        }

        const lastGold = lastGoldByKey.get(key);
        if (!lastGold || event.date > lastGold) {
          lastGoldByKey.set(key, event.date);
        }
      }
    }
  }

  // Second pass: detect silver PRs only for stale tracker keys, within the window.
  for (const tracker of createAllPRTrackers()) {
    const events = tracker.buildEvents(sortedSets);
    for (const event of events) {
      if (event.date < silverCutoff) continue;

      const key = `${tracker.type}::${tracker.getKey(event)}`;
      const lastGold = lastGoldByKey.get(key);
      if (lastGold && lastGold >= silverCutoff) continue;

      const currentValue = tracker.calculateValue(event);
      const previousBest = tracker.getPreviousBest(key);

      if (tracker.isBetter(event, currentValue, previousBest)) {
        silverPRs.push(makeResult(tracker, event, previousBest, currentValue));
        tracker.setBest(key, currentValue);
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
    .filter((s) => s.parsedDate && !isWarmupSet(s))
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
  createRepsTracker(),
  createWeightedRepsTracker(),
  createSessionVolumeTracker(),
  createDistanceTracker(),
];

// ---------------------------------------------------------------------------
// PR importance ranking
// ---------------------------------------------------------------------------

/** Lower number = more important. Used to pick a single PR when an exercise has several. */
export const PR_PRIORITY: Record<PrType, number> = {
  oneRm: 0,
  weight: 1,
  volume: 2,
  sessionVolume: 3,
  reps: 4,
  weightedReps: 5,
  distance: 6,
};

export interface PRImportance {
  type: PrType;
  isSilver?: boolean;
}

/**
 * Compare two PRs: more important wins. Within the same set, tier comes
 * first (gold beats silver), then type priority (e.g. 1RM > weight).
 */
export const isMoreImportantPR = (a: PRImportance, b: PRImportance): boolean => {
  const tierDiff = (a.isSilver ? 1 : 0) - (b.isSilver ? 1 : 0);
  if (tierDiff !== 0) return tierDiff < 0;
  return PR_PRIORITY[a.type] < PR_PRIORITY[b.type];
};
