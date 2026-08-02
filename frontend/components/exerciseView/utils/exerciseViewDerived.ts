import { subDays } from 'date-fns';
import { ExerciseStats } from '../../../types';
import { ExerciseMuscleData, getExerciseMuscleVolumes, lookupExerciseMuscleData, SVG_MUSCLE_NAMES } from '../../../utils/muscle/mapping';
import { summarizeExerciseHistory } from '../../../utils/analysis/exerciseTrend';
import { MUSCLE_NAMES } from '../../../utils/muscle/mapping';
import { getVolumeZone, getVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';
import type { ExerciseMuscleTargets, InactiveReason } from './exerciseViewTypes';

export const getInactiveReason = (
  selectedStats: ExerciseStats | undefined,
  effectiveNow: Date,
  summarizedHistoryByName: Map<string, import('../../../utils/analysis/exerciseTrend').ExerciseSessionEntry[]>
): InactiveReason | null => {
  if (!selectedStats) return null;

  const activeSince = subDays(effectiveNow, 45);
  const sessions = summarizedHistoryByName.get(selectedStats.name) ?? summarizeExerciseHistory(selectedStats.history, { exerciseName: selectedStats.name });
  const lastDate = sessions[0]?.date ?? null;
  const tooOld = !lastDate || lastDate < activeSince;

  if (!tooOld) return null;

  const parts: string[] = [];
  if (tooOld) parts.push('You haven\'t trained this exercise recently');

  return {
    parts,
    tooOld,
  };
};

export const getExerciseSpanDays = (
  selectedStats: ExerciseStats | undefined,
  summarizedHistoryByName: Map<string, import('../../../utils/analysis/exerciseTrend').ExerciseSessionEntry[]>
): number => {
  if (!selectedStats) return 0;
  const sessions = summarizedHistoryByName.get(selectedStats.name) ?? summarizeExerciseHistory(selectedStats.history, { exerciseName: selectedStats.name });
  if (sessions.length === 0) return 0;
  const dates = sessions.map((h) => h.date.getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
};

export const buildExerciseMuscleTargets = (
  selectedStats: ExerciseStats | undefined,
  exerciseMuscleData: Map<string, ExerciseMuscleData>,
  secondarySetMultiplier: number = 0.5
): ExerciseMuscleTargets => {
  const exData = selectedStats ? lookupExerciseMuscleData(selectedStats.name, exerciseMuscleData) : undefined;
  const { volumes, maxVolume } = getExerciseMuscleVolumes(exData, secondarySetMultiplier);

  const aggregated = new Map<string, { sets: number }>();
  volumes.forEach((sets, svgId) => {
    const label = SVG_MUSCLE_NAMES[svgId] || svgId;
    const prev = aggregated.get(label);
    if (!prev || sets > prev.sets) {
      aggregated.set(label, { sets });
    }
  });

  const primaryTargets: Array<{ label: string; sets: number }> = [];
  const secondaryTargets: Array<{ label: string; sets: number }> = [];

  for (const [label, { sets }] of aggregated.entries()) {
    if (sets >= 1) primaryTargets.push({ label, sets });
    else secondaryTargets.push({ label, sets });
  }

  primaryTargets.sort((a, b) => a.label.localeCompare(b.label));
  secondaryTargets.sort((a, b) => a.label.localeCompare(b.label));

  return { exData, volumes, maxVolume, primaryTargets, secondaryTargets };
};

export const getBodyMapHoverMeta = (
  hoveredMuscle: string | null,
  muscleVolumes: Map<string, number>,
  thresholds?: { mv: number; mev: number; mrv: number; maxv: number }
): { name: string; role: string; zoneLabel: string; zoneExplanation: string } | null => {
  if (!hoveredMuscle) return null;
  const name = (MUSCLE_NAMES as any)[hoveredMuscle] ?? hoveredMuscle;
  const w = muscleVolumes.get(hoveredMuscle) ?? 0;
  const role = w >= 1 ? 'Primary' : w > 0 ? 'Secondary' : '';
  const zone = getVolumeZone(w, thresholds ?? getVolumeThresholds());
  return { name, role, zoneLabel: zone.label, zoneExplanation: zone.explanation };
};
