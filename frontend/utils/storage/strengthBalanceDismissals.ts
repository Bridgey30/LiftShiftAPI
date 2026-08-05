import { useSyncExternalStore } from 'react';

export type StrengthBalanceDismissReason =
  | 'sport-specific'
  | 'already-working'
  | 'not-relevant'
  | 'data-looks-wrong';

const STORAGE_KEY = 'strengthBalanceDismissals';
const DISMISS_DAYS = 90;

interface DismissalEntry {
  reason: StrengthBalanceDismissReason;
  until: number;
}

type Store = Map<string, DismissalEntry>;

let cache: Store | null = null;
let dismissedIds: Set<string> | null = null;
const listeners = new Set<() => void>();

const load = (): Store => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries: [string, DismissalEntry][] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    cache = new Map(entries.filter(([, entry]) => entry && entry.until > now));
  } catch {
    cache = new Map();
  }
  return cache;
};

const save = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(load().entries())));
  } catch {
    // Storage unavailable (private mode / quota) — dismissal just won't persist.
  }
  dismissedIds = null;
  listeners.forEach((l) => l());
};

/** True while the pair is suppressed (90 days). */
export const isPairDismissed = (pairId: string): boolean => {
  const entry = load().get(pairId);
  return !!entry && entry.until > Date.now();
};

/** Suppress a finding for 90 days with a user-selected reason. */
export const dismissPair = (pairId: string, reason: StrengthBalanceDismissReason): void => {
  load().set(pairId, {
    reason,
    until: Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000,
  });
  save();
};

/** Restore a previously dismissed finding. */
export const undoDismissPair = (pairId: string): void => {
  if (load().delete(pairId)) save();
};

/** Snapshot of currently-dismissed pair ids (cached between saves). */
export const getDismissedPairIds = (): Set<string> => {
  if (dismissedIds) return dismissedIds;
  const ids = new Set<string>();
  const now = Date.now();
  for (const [id, entry] of load()) {
    if (entry.until > now) ids.add(id);
  }
  dismissedIds = ids;
  return ids;
};

/** React hook: re-renders whenever the dismissal set changes. */
export const useStrengthBalanceDismissals = (): Set<string> =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getDismissedPairIds,
  );
