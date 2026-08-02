export interface MuscleFallbackMap {
  [muscleId: string]: string;
}

/**
 * Muscle IDs present on the current body map SVGs.
 * Muscles not present here fall back to the closest available muscle below.
 */
export const AVAILABLE_BODYMAP_MUSCLES: readonly string[] = [
  'traps', 'neck', 'shoulders', 'chest', 'biceps', 'forearms',
  'abdominals', 'obliques', 'adductors', 'abductors', 'quads', 'calves',
  'lats', 'triceps', 'lowerback', 'glutes', 'hamstrings',
];

export const BODYMAP_MUSCLE_FALLBACKS: MuscleFallbackMap = {
  adductors: 'glutes',
  abductors: 'glutes',
  neck: 'traps',
};

export function getMuscleWithFallback(muscleId: string): string {
  if (AVAILABLE_BODYMAP_MUSCLES.includes(muscleId)) {
    return muscleId;
  }

  const fallback = BODYMAP_MUSCLE_FALLBACKS[muscleId];
  if (fallback && AVAILABLE_BODYMAP_MUSCLES.includes(fallback)) {
    return fallback;
  }

  return muscleId;
}
