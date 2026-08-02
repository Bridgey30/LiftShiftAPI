import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../data/exerciseAssets';
import type { MuscleId } from '../../muscle/mapping/muscleIds';
import { isWarmupSet, getWeeklyVolumeSetWeight } from '../classification';
import { lookupAsset } from '../../muscle/analytics/muscleAnalyticsHelpers';
import { getMuscleContributionsFromAsset } from '../../muscle/analytics/muscleContributions';
import { getSvgIdsForCsvMuscleName } from '../../muscle/mapping/muscleCsvMappings';
import { DETAILED_SVG_ID_TO_MUSCLE_ID } from '../../muscle/mapping/muscleSvgMappings';

// ============================================================================
// Types
// ============================================================================

export type JointId = 'shoulder' | 'elbow' | 'knee' | 'lowerBack' | 'hip';

export interface JointDefinition {
  id: JointId;
  label: string;
  muscles: MuscleId[];
  antagonistA: MuscleId[];
  antagonistB: MuscleId[];
}

export interface JointFactorScores {
  acwr: number;
  recovery: number;
  imbalance: number;
}

export interface InjuryRiskResult {
  joint: JointId;
  label: string;
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  factors: JointFactorScores;
  primaryReason: string;
  raw: {
    acuteSets: number;
    chronicAvgSets: number;
    acwrRatio: number;
    backToBackDays: number;
    workedDays7d: number;
    imbalanceRatio: number;
    antagonistASetsPerWeek: number;
    antagonistBSetsPerWeek: number;
    antagonistALabel: string;
    antagonistBLabel: string;
  };
}

// ============================================================================
// Joint Definitions
// ============================================================================

export const JOINTS: readonly JointDefinition[] = [
  {
    id: 'shoulder',
    label: 'Shoulder',
    muscles: ['chest', 'shoulders', 'traps', 'lats'],
    antagonistA: ['chest'],
    antagonistB: ['traps', 'lats'],
  },
  {
    id: 'elbow',
    label: 'Elbow',
    muscles: ['biceps', 'triceps', 'forearms'],
    antagonistA: ['biceps'],
    antagonistB: ['triceps'],
  },
  {
    id: 'knee',
    label: 'Knee',
    muscles: ['quads', 'hamstrings', 'calves'],
    antagonistA: ['quads'],
    antagonistB: ['hamstrings'],
  },
  {
    id: 'lowerBack',
    label: 'Lower Back',
    muscles: ['lowerback', 'abdominals', 'obliques'],
    antagonistA: ['lowerback'],
    antagonistB: ['abdominals', 'obliques'],
  },
  {
    id: 'hip',
    label: 'Hip',
    muscles: ['glutes', 'hamstrings', 'quads', 'abdominals'],
    antagonistA: ['glutes', 'hamstrings'],
    antagonistB: ['quads', 'abdominals'],
  },
] as const;

// ============================================================================
// Factor Weights
// ============================================================================

export const INJURY_FACTOR_WEIGHTS = {
  acwr: 0.45,
  recovery: 0.30,
  imbalance: 0.25,
} as const;

export const INJURY_FACTOR_COLORS = {
  acwr: '#3b82f6',
  recovery: '#a78bfa',
  imbalance: '#22d3ee',
} as const;

export const INJURY_FACTOR_LABELS = {
  acwr: 'Workload Ratio',
  recovery: 'Recovery',
  imbalance: 'Balance',
} as const;

// ============================================================================
// Risk Level
// ============================================================================

export function getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'moderate';
  return 'low';
}

export function getRiskColor(score: number): string {
  if (score >= 60) return '#ef4444';
  if (score >= 40) return '#f97316';
  if (score >= 20) return '#f59e0b';
  return '#22c55e';
}

export function getRiskRating(score: number): { label: string; color: string } {
  if (score >= 60) return { label: 'Critical', color: '#ef4444' };
  if (score >= 40) return { label: 'High', color: '#f97316' };
  if (score >= 20) return { label: 'Moderate', color: '#f59e0b' };
  return { label: 'Low', color: '#22c55e' };
}

// ============================================================================
// Helpers
// ============================================================================

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolveMuscleIds(asset: ExerciseAsset): MuscleId[] {
  const contribs = getMuscleContributionsFromAsset(asset, false, { secondarySetMultiplier: 0.5 });
  const ids = new Set<MuscleId>();
  for (const c of contribs) {
    const svgIds = getSvgIdsForCsvMuscleName(c.muscle);
    for (const svgId of svgIds) {
      const hid = (DETAILED_SVG_ID_TO_MUSCLE_ID as Record<string, MuscleId>)[svgId];
      if (hid) ids.add(hid);
    }
  }
  return Array.from(ids);
}

// ============================================================================
// Lightweight daily check — only tracks which dates a joint was worked.
// Does NOT count sets — that's handled by computeWeeklySetsDashboardData.
// ============================================================================

export function buildJointDays7d(
  sets: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  assetsLowerMap: Map<string, ExerciseAsset>,
  effectiveNow: Date,
): Map<JointId, Set<string>> {
  const now = new Date(effectiveNow.getFullYear(), effectiveNow.getMonth(), effectiveNow.getDate());
  const day7Ago = new Date(now.getTime() - 7 * 86400000);

  const jointDays = new Map<JointId, Set<string>>();
  for (const joint of JOINTS) {
    jointDays.set(joint.id, new Set());
  }

  for (const s of sets) {
    const d = s.parsedDate;
    if (!d) continue;
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dateOnly < day7Ago || dateOnly > now) continue;

    if (isWarmupSet(s) || getWeeklyVolumeSetWeight(s) <= 0) continue;

    const name = (s.exercise_title || '').trim();
    const asset = lookupAsset(name, assetsMap, assetsLowerMap);
    if (!asset) continue;

    const muscleIds = resolveMuscleIds(asset);
    if (muscleIds.length === 0) continue;

    const dateKey = toDateKey(dateOnly);
    for (const joint of JOINTS) {
      if (muscleIds.some(mid => (joint.muscles as readonly string[]).includes(mid))) {
        jointDays.get(joint.id)?.add(dateKey);
      }
    }
  }

  return jointDays;
}

// ============================================================================
// Main Engine
// ============================================================================

export function computeInjuryRisk(
  acuteWeeklyRates: Map<string, number>,
  chronicWeeklyRates: Map<string, number>,
  jointDays7d: Map<JointId, Set<string>>,
): InjuryRiskResult[] {
  const msPerDay = 86400000;

  const results: InjuryRiskResult[] = [];

  for (const joint of JOINTS) {
    // --- Aggregate per-joint weekly rates ---
    let acuteJointRate = 0;
    let chronicJointRate = 0;
    for (const mid of joint.muscles) {
      acuteJointRate += acuteWeeklyRates.get(mid) ?? 0;
      chronicJointRate += chronicWeeklyRates.get(mid) ?? 0;
    }

    // --- Factor 1: ACWR (0-100) ---
    const acwr = chronicJointRate > 0 ? acuteJointRate / chronicJointRate : 1.0;
    let acwrScore: number;
    if (acwr <= 1.2) {
      acwrScore = 0;
    } else if (acwr >= 2.0) {
      acwrScore = 100;
    } else {
      acwrScore = Math.round(((acwr - 1.2) / (2.0 - 1.2)) * 100);
    }

    // --- Factor 2: Recovery Density (0-100) ---
    const workedDays = Array.from(jointDays7d.get(joint.id) ?? [])
      .map(dk => new Date(dk + 'T00:00:00').getTime())
      .sort((a, b) => a - b);

    let backToBackCount = 0;
    for (let i = 0; i < workedDays.length - 1; i++) {
      if (workedDays[i + 1] - workedDays[i] <= msPerDay) {
        backToBackCount++;
      }
    }
    const recoveryScore = workedDays.length > 1
      ? Math.round(Math.min(100, (backToBackCount / 7) * 100))
      : 0;

    // --- Factor 3: Muscle Imbalance (0-100) ---
    let totalA = 0;
    let totalB = 0;
    for (const mid of joint.antagonistA) {
      totalA += chronicWeeklyRates.get(mid) ?? 0;
    }
    for (const mid of joint.antagonistB) {
      totalB += chronicWeeklyRates.get(mid) ?? 0;
    }

    let imbalanceScore: number;
    if (totalA <= 0 || totalB <= 0) {
      imbalanceScore = 0;
    } else {
      const ratio = Math.max(totalA, totalB) / Math.min(totalA, totalB);
      if (ratio <= 1.3) {
        imbalanceScore = 0;
      } else if (ratio >= 2.5) {
        imbalanceScore = 100;
      } else {
        imbalanceScore = Math.round(((ratio - 1.3) / (2.5 - 1.3)) * 100);
      }
    }

    // --- Clamp to avoid zero/max visual artifacts on progress bars ---
    const clamp = (v: number) => Math.max(2, Math.min(98, v));
    const acwrClamped = clamp(acwrScore);
    const recoveryClamped = clamp(recoveryScore);
    const imbalanceClamped = clamp(imbalanceScore);

    // --- Weighted Total ---
    const riskScore = Math.min(100, Math.round(
      acwrClamped * INJURY_FACTOR_WEIGHTS.acwr +
      recoveryClamped * INJURY_FACTOR_WEIGHTS.recovery +
      imbalanceClamped * INJURY_FACTOR_WEIGHTS.imbalance
    ));

    // --- Primary Reason ---
    const scores: { factor: string; value: number; label: string }[] = [
      { factor: 'acwr', value: acwrClamped, label: 'Workload ratio spike' },
      { factor: 'recovery', value: recoveryClamped, label: 'Insufficient rest between sessions' },
      { factor: 'imbalance', value: imbalanceClamped, label: `Muscle imbalance (${joint.antagonistA.join('+')} vs ${joint.antagonistB.join('+')})` },
    ];
    scores.sort((a, b) => b.value - a.value);
    const primaryReason = scores[0].value > 0
      ? scores[0].label
      : 'All factors within safe range';

    const imbalanceRatio = totalA > 0 && totalB > 0
      ? Math.max(totalA, totalB) / Math.min(totalA, totalB)
      : 1;

    results.push({
      joint: joint.id,
      label: joint.label,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      factors: {
        acwr: acwrClamped,
        recovery: recoveryClamped,
        imbalance: imbalanceClamped,
      },
      primaryReason: `${joint.label}: ${primaryReason}`,
      raw: {
        acuteSets: Math.round(acuteJointRate),
        chronicAvgSets: Math.round(chronicJointRate),
        acwrRatio: Math.round(acwr * 10) / 10,
        backToBackDays: backToBackCount,
        workedDays7d: workedDays.length,
        imbalanceRatio: Math.round(imbalanceRatio * 10) / 10,
        antagonistASetsPerWeek: Math.round(totalA),
        antagonistBSetsPerWeek: Math.round(totalB),
        antagonistALabel: joint.antagonistA.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('+'),
        antagonistBLabel: joint.antagonistB.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('+'),
      },
    });
  }

  return results;
}
