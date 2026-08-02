/**
 * Strength Balance ratio registry.
 *
 * Movements are keyed by canonical exercise names that exist in
 * exercises_muscles_and_thumbnail_data.csv (verified). Raw exercise titles
 * from imports are resolved to canonical names first via the exercise name
 * resolver, then matched here.
 *
 * Ratio bands are population statistics (StrengthLevel ~28M users, ExRx,
 * JSAMS 2024 normative data for the big three). They are intentionally wide:
 * flags fire only for clear outliers.
 */

export type MovementId =
  | 'bench'
  | 'incline_bench'
  | 'overhead_press'
  | 'lateral_raise'
  | 'squat'
  | 'front_squat'
  | 'deadlift'
  | 'romanian_deadlift'
  | 'row'
  | 'pulldown'
  | 'leg_curl'
  | 'leg_extension'
  | 'curl'
  | 'pushdown'
  | 'skullcrusher';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms';

export interface StrengthMovement {
  id: MovementId;
  /** Short human label used in copy, e.g. "side raises". */
  label: string;
  /** Muscle group used for TL;DR synthesis, e.g. "chest". */
  muscleGroup: MuscleGroup;
  /** Canonical names as they appear in the assets CSV. */
  canonicalNames: string[];
  /** Subset of canonicalNames that are per-arm: load is doubled for comparison. */
  unilateralNames?: string[];
}

export interface StrengthPair {
  id: string;
  a: MovementId;
  b: MovementId;
  /** Expected a/b strength ratio range for typical lifters (copy + confidence). */
  expectedMin: number;
  expectedMax: number;
  /** Hard a/b ratio band: outside this is an anomaly worth flagging. */
  hardMin: number;
  hardMax: number;
  researchConfidence: 'high' | 'medium';
}

export const STRENGTH_MOVEMENTS: StrengthMovement[] = [
  { id: 'bench', label: 'bench press', muscleGroup: 'chest', canonicalNames: ['Bench Press (Barbell)', 'Barbell Bench Press', 'Bench Press', 'Dumbbell Bench Press', 'Lever Chest Press'], unilateralNames: ['Dumbbell Bench Press'] },
  { id: 'incline_bench', label: 'incline bench press', muscleGroup: 'chest', canonicalNames: ['Incline Bench Press (Barbell)', 'Incline Bench Press', 'Dumbbell Incline Bench Press'], unilateralNames: ['Dumbbell Incline Bench Press'] },
  { id: 'overhead_press', label: 'shoulder press', muscleGroup: 'shoulders', canonicalNames: ['Shoulder Press', 'Shoulder Press (Dumbbell)', 'Arnold Press', 'Lever Seated Shoulder Press', 'Dumbbell Seated Shoulder Press'], unilateralNames: ['Shoulder Press (Dumbbell)', 'Arnold Press', 'Dumbbell Seated Shoulder Press'] },
  { id: 'lateral_raise', label: 'side raises', muscleGroup: 'shoulders', canonicalNames: ['Lateral Raise (Dumbbell)', 'Dumbbell Lateral Raise', 'Lateral Raise', 'Cable Lateral Raise', 'Lateral Raise (Cable)', 'Lateral Raise (Machine)', 'Dumbbell Chest Supported Lateral Raises', 'Dumbbell Seated Lateral Raise'], unilateralNames: ['Lateral Raise (Dumbbell)', 'Dumbbell Lateral Raise', 'Lateral Raise', 'Cable Lateral Raise', 'Lateral Raise (Cable)', 'Dumbbell Chest Supported Lateral Raises', 'Dumbbell Seated Lateral Raise'] },
  { id: 'squat', label: 'back squat', muscleGroup: 'legs', canonicalNames: ['Squat (Barbell)', 'Barbell Squat', 'Squat'] },
  { id: 'front_squat', label: 'front squat', muscleGroup: 'legs', canonicalNames: ['Front Squat', 'Barbell Front Squat'] },
  { id: 'deadlift', label: 'deadlift', muscleGroup: 'back', canonicalNames: ['Deadlift (Barbell)', 'Barbell Deadlift', 'Deadlift'] },
  { id: 'romanian_deadlift', label: 'Romanian deadlift', muscleGroup: 'back', canonicalNames: ['Romanian Deadlift (Barbell)', 'Romanian Deadlift'] },
  { id: 'row', label: 'rows', muscleGroup: 'back', canonicalNames: ['Bent Over Row (Barbell)', 'Bent Over Row', 'Lever Seated Row', 'Lever Neutral Grip Seated Row', 'Straight Back Seated Row', 'Lever Pronated Grip Seated Row (plate loaded)'] },
  { id: 'pulldown', label: 'lat pulldown', muscleGroup: 'back', canonicalNames: ['Lat Pulldown (Cable)', 'Cable Neutral Grip Lat Pulldown (male)', 'Cable Bar Lateral Pulldown', 'Lever Front Pulldown'] },
  { id: 'leg_curl', label: 'leg curls', muscleGroup: 'legs', canonicalNames: ['Seated Leg Curl (Machine)', 'Lying Leg Curl (Machine)', 'Lever Lying Leg Curl'] },
  { id: 'leg_extension', label: 'leg extensions', muscleGroup: 'legs', canonicalNames: ['Leg Extension (Machine)', 'Lever Leg Extension'] },
  { id: 'curl', label: 'curls', muscleGroup: 'arms', canonicalNames: ['Barbell Curl', 'EZ Bar Biceps Curl', 'Cable Hammer Curl', 'Dumbbell Incline Biceps Curl', 'Dumbbell Incline Hammer Curl', 'Cable Curl'], unilateralNames: ['Dumbbell Incline Biceps Curl', 'Dumbbell Incline Hammer Curl'] },
  { id: 'pushdown', label: 'triceps pushdowns', muscleGroup: 'arms', canonicalNames: ['Triceps Pushdown', 'Cable Triceps Pushdown', 'Overhead Triceps Extension', 'Cable Overhead Tricep Extension StraighT-bar'] },
  { id: 'skullcrusher', label: 'skullcrushers', muscleGroup: 'arms', canonicalNames: ['Skullcrusher (Barbell)', 'Skullcrusher (Dumbbell)'], unilateralNames: ['Skullcrusher (Dumbbell)'] },
];

// Hard bands are the original research-based thresholds (ExRx, StrengthLevel,
// JSAMS 2024 normative data), i.e. the strict values used for flagging.
export const STRENGTH_PAIRS: StrengthPair[] = [
  { id: 'bench-ohp', a: 'bench', b: 'overhead_press', expectedMin: 1.43, expectedMax: 1.67, hardMin: 1.25, hardMax: 1.9, researchConfidence: 'high' },
  { id: 'press-side-raise', a: 'overhead_press', b: 'lateral_raise', expectedMin: 1.7, expectedMax: 2.9, hardMin: 1.2, hardMax: 3.3, researchConfidence: 'high' },
  { id: 'squat-bench', a: 'squat', b: 'bench', expectedMin: 1.3, expectedMax: 1.5, hardMin: 1.2, hardMax: 1.7, researchConfidence: 'high' },
  { id: 'deadlift-bench', a: 'deadlift', b: 'bench', expectedMin: 1.5, expectedMax: 1.8, hardMin: 1.4, hardMax: 2.0, researchConfidence: 'high' },
  { id: 'deadlift-squat', a: 'deadlift', b: 'squat', expectedMin: 1.1, expectedMax: 1.25, hardMin: 1.0, hardMax: 1.35, researchConfidence: 'high' },
  { id: 'row-bench', a: 'row', b: 'bench', expectedMin: 0.85, expectedMax: 0.95, hardMin: 0.7, hardMax: 1.15, researchConfidence: 'medium' },
  { id: 'pulldown-bench', a: 'pulldown', b: 'bench', expectedMin: 0.8, expectedMax: 0.9, hardMin: 0.7, hardMax: 1.05, researchConfidence: 'medium' },
  { id: 'incline-bench', a: 'incline_bench', b: 'bench', expectedMin: 0.85, expectedMax: 0.95, hardMin: 0.7, hardMax: 1.15, researchConfidence: 'high' },
  { id: 'front-squat', a: 'front_squat', b: 'squat', expectedMin: 0.8, expectedMax: 0.85, hardMin: 0.65, hardMax: 1.0, researchConfidence: 'medium' },
  { id: 'curl-extension', a: 'leg_curl', b: 'leg_extension', expectedMin: 0.6, expectedMax: 0.8, hardMin: 0.4, hardMax: 1.0, researchConfidence: 'medium' },
  { id: 'curl-pushdown', a: 'curl', b: 'pushdown', expectedMin: 0.75, expectedMax: 1.0, hardMin: 0.6, hardMax: 1.2, researchConfidence: 'medium' },
  { id: 'skullcrusher-pushdown', a: 'skullcrusher', b: 'pushdown', expectedMin: 0.71, expectedMax: 0.91, hardMin: 0.55, hardMax: 1.15, researchConfidence: 'medium' },
  { id: 'rdl-deadlift', a: 'romanian_deadlift', b: 'deadlift', expectedMin: 0.75, expectedMax: 0.85, hardMin: 0.6, hardMax: 1.05, researchConfidence: 'medium' },
];

const movementById = new Map<string, StrengthMovement>(STRENGTH_MOVEMENTS.map((m) => [m.id, m]));

const canonicalToMovement = new Map<string, MovementId>();
for (const movement of STRENGTH_MOVEMENTS) {
  for (const name of movement.canonicalNames) {
    canonicalToMovement.set(name.toLowerCase(), movement.id);
  }
}

export const getStrengthMovement = (id: string): StrengthMovement | undefined => movementById.get(id);

export const getMovementForCanonicalName = (canonicalName: string): MovementId | undefined =>
  canonicalToMovement.get(canonicalName.toLowerCase());
