import type { HeadlessMuscleId, MuscleId } from './muscleHeadless';

export const DETAILED_SVG_ID_TO_MUSCLE_ID: Readonly<Record<string, MuscleId>> = {
  // Chest
  'mid-lower-pectoralis': 'chest',
  'upper-pectoralis': 'chest',

  // Arms
  'long-head-bicep': 'biceps',
  'short-head-bicep': 'biceps',
  'medial-head-triceps': 'triceps',
  'long-head-triceps': 'triceps',
  'lateral-head-triceps': 'triceps',
  'wrist-extensors': 'forearms',
  'wrist-flexors': 'forearms',

  // Shoulders
  'anterior-deltoid': 'shoulders',
  'lateral-deltoid': 'shoulders',
  'posterior-deltoid': 'shoulders',

  // Back
  'upper-trapezius': 'traps',
  'lower-trapezius': 'traps',
  'traps-middle': 'traps',
  lats: 'lats',
  lowerback: 'lowerback',

  // Core
  'lower-abdominals': 'abdominals',
  'upper-abdominals': 'abdominals',
  obliques: 'obliques',

  // Legs
  'outer-quadricep': 'quads',
  'rectus-femoris': 'quads',
  'inner-quadricep': 'quads',
  'medial-hamstrings': 'hamstrings',
  'lateral-hamstrings': 'hamstrings',
  'gluteus-maximus': 'glutes',
  'gluteus-medius': 'glutes',
  gastrocnemius: 'calves',
  soleus: 'calves',
  tibialis: 'calves',
  // Note: 'inner-thigh' intentionally has no headless target (not present in group SVG).
};

/** @deprecated Use DETAILED_SVG_ID_TO_MUSCLE_ID instead */
export const DETAILED_SVG_ID_TO_HEADLESS_ID: Readonly<Record<string, HeadlessMuscleId>> = {
  // Chest
  'mid-lower-pectoralis': 'chest',
  'upper-pectoralis': 'chest',

  // Arms
  'long-head-bicep': 'biceps',
  'short-head-bicep': 'biceps',
  'medial-head-triceps': 'triceps',
  'long-head-triceps': 'triceps',
  'lateral-head-triceps': 'triceps',
  'wrist-extensors': 'forearms',
  'wrist-flexors': 'forearms',

  // Shoulders
  'anterior-deltoid': 'shoulders',
  'lateral-deltoid': 'shoulders',
  'posterior-deltoid': 'shoulders',

  // Back
  'upper-trapezius': 'traps',
  'lower-trapezius': 'traps',
  'traps-middle': 'traps',
  lats: 'lats',
  lowerback: 'lowerback',

  // Core
  'lower-abdominals': 'abdominals',
  'upper-abdominals': 'abdominals',
  obliques: 'obliques',

  // Legs
  'outer-quadricep': 'quads',
  'rectus-femoris': 'quads',
  'inner-quadricep': 'quads',
  'medial-hamstrings': 'hamstrings',
  'lateral-hamstrings': 'hamstrings',
  'gluteus-maximus': 'glutes',
  'gluteus-medius': 'glutes',
  gastrocnemius: 'calves',
  soleus: 'calves',
  tibialis: 'calves',
  // Note: 'inner-thigh' intentionally has no headless target (not present in group SVG).
};

export const MUSCLE_ID_TO_DETAILED_SVG_IDS: Readonly<Record<MuscleId, readonly string[]>> = {
  chest: ['mid-lower-pectoralis', 'upper-pectoralis'],
  biceps: ['long-head-bicep', 'short-head-bicep'],
  triceps: ['medial-head-triceps', 'long-head-triceps', 'lateral-head-triceps'],
  forearms: ['wrist-extensors', 'wrist-flexors'],
  shoulders: ['anterior-deltoid', 'lateral-deltoid', 'posterior-deltoid'],
  traps: ['upper-trapezius', 'lower-trapezius', 'traps-middle'],
  lats: ['lats'],
  lowerback: ['lowerback'],
  abdominals: ['lower-abdominals', 'upper-abdominals'],
  obliques: ['obliques'],
  quads: ['outer-quadricep', 'rectus-femoris', 'inner-quadricep'],
  hamstrings: ['medial-hamstrings', 'lateral-hamstrings'],
  glutes: ['gluteus-maximus', 'gluteus-medius'],
  calves: ['gastrocnemius', 'soleus', 'tibialis'],
  adductors: ['adductor-longus', 'adductor-magnus', 'gracilis'],
};

/** @deprecated Use MUSCLE_ID_TO_DETAILED_SVG_IDS instead */
export const HEADLESS_ID_TO_DETAILED_SVG_IDS: Readonly<Record<HeadlessMuscleId, readonly string[]>> = MUSCLE_ID_TO_DETAILED_SVG_IDS;

export const getMuscleIdForDetailedSvgId = (svgId: string): MuscleId | null => {
  return DETAILED_SVG_ID_TO_MUSCLE_ID[svgId] ?? null;
};

/** @deprecated Use getMuscleIdForDetailedSvgId instead */
export const getHeadlessIdForDetailedSvgId = (svgId: string): HeadlessMuscleId | null => {
  return getMuscleIdForDetailedSvgId(svgId);
};

export const getDetailedSvgIdsForMuscleId = (muscleId: string): readonly string[] => {
  return (MUSCLE_ID_TO_DETAILED_SVG_IDS as any)[muscleId] ?? [];
};

/** @deprecated Use getDetailedSvgIdsForMuscleId instead */
export const getDetailedSvgIdsForHeadlessId = (headlessId: string): readonly string[] => {
  return getDetailedSvgIdsForMuscleId(headlessId);
};
