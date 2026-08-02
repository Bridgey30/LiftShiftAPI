export const MUSCLE_IDS = [
  'chest',
  'biceps',
  'triceps',
  'forearms',
  'shoulders',
  'traps',
  'lats',
  'lowerback',
  'abdominals',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
  'neck',
] as const;

export type MuscleId = typeof MUSCLE_IDS[number];

export const MUSCLE_NAMES: Readonly<Record<MuscleId, string>> = {
  chest: 'Chest',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  shoulders: 'Shoulders',
  traps: 'Traps',
  lats: 'Lats',
  lowerback: 'Lower Back',
  abdominals: 'Abs',
  obliques: 'Obliques',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  adductors: 'Adductors',
  abductors: 'Abductors',
  neck: 'Neck',
};

const roundToOneDecimal = (n: number): number => Math.round(n * 10) / 10;

/** Build radar chart series from muscle volume map: order by value descending (highest first), rounded values. */
export function getMuscleRadarSeries(muscleVolumes: Map<string, number>): { subject: string; value: number }[] {
  const raw = MUSCLE_IDS.map((id) => ({
    subject: MUSCLE_NAMES[id],
    value: roundToOneDecimal(muscleVolumes.get(id) ?? 0),
  }));
  return [...raw].sort((a, b) => b.value - a.value);
}
