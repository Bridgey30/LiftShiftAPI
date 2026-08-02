export type PrType = 'weight' | 'oneRm' | 'volume' | 'reps' | 'weightedReps' | 'sessionVolume' | 'distance';

export interface WorkoutSet {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  exercise_title: string;
  exercise_index?: number;
  superset_id: string;
  exercise_notes: string;
  set_index: number;
  set_type: string;
  weight_kg: number;
  weight_unit?: 'kg' | 'lbs';
  reps: number;
  distance_km: number;
  duration_seconds: number;
  rpe: number | null;
  parsedDate?: Date;
  isPr?: boolean;
  prTypes?: PrType[];
  isSilverPr?: boolean;
  silverPrTypes?: PrType[];
  source?: 'hevy' | 'lyfta' | 'strong' | 'other' | 'motra';
}

export interface ExerciseHistoryEntry {
  date: Date;
  weight: number;
  reps: number;
  oneRepMax: number;
  volume: number;
  isPr: boolean;
  prTypes?: PrType[];
  isSilverPr?: boolean;
  silverPrTypes?: PrType[];
  /** For unilateral exercises: 'left', 'right', or undefined for bilateral */
  side?: 'left' | 'right';
  set_type: string;
}

export interface ExerciseStats {
  name: string;
  totalSets: number;
  totalVolume: number;
  maxWeight: number;
  prCount: number;
  history: ExerciseHistoryEntry[];
  /** True if exercise has left/right set data */
  hasUnilateralData?: boolean;
}

export interface DailySummary {
  date: string;
  timestamp: number;
  totalVolume: number;
  workoutTitle: string;
  sets: number;
  avgReps: number;
  durationMinutes: number;
  density: number;
}

export type WisdomType = 'efficiency' | 'hypertrophy' | 'crash' | 'promote' | 'demote' | 'neutral';

export interface SetWisdom {
  type: WisdomType;
  message: string;
  tooltip?: string;
}

export interface SessionAnalysis {
  goalLabel: string;
  avgReps: number;
  setCount: number;
  tooltip?: string;
  primaryGoal?: string;
  secondaryGoal?: string;
  repBands?: {
    strengthSets: number;
    hypertrophySets: number;
    enduranceSets: number;
    totalWorkingSets: number;
    strengthPct: number;
    hypertrophyPct: number;
    endurancePct: number;
  };
}

export type AnalysisStatus = 'success' | 'warning' | 'danger' | 'info';

export interface AnalysisMetrics {
  weight_change_pct: string;
  vol_drop_pct: string;
  actual_reps: number;
  expected_reps: string;
}

export interface TooltipLine {
  text: string;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
  bold?: boolean;
}

export interface StructuredTooltip {
  trend: { value: string; direction: 'up' | 'down' | 'same' };
  why: TooltipLine[];
  improve?: TooltipLine[];
}

export interface AnalysisResult {
  transition: string;
  status: AnalysisStatus;
  metrics: AnalysisMetrics;
  tooltip: string;
  shortMessage: string;
  structured?: StructuredTooltip;
  loadProgressionDirection?: 'higher' | 'lower';
}
