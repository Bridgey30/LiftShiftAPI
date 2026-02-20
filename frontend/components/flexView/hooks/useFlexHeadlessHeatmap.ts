import { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';

import type { WorkoutSet } from '../../../types';
import { isWarmupSet } from '../../../utils/analysis/classification';
import {
  getExerciseMuscleVolumes,
  lookupExerciseMuscleData,
  toMuscleVolumeMap,
  type ExerciseMuscleData,
} from '../../../utils/muscle/mapping';
import type { FlexHeadlessHeatmap } from '../utils/flexViewTypes';

export const useFlexHeadlessHeatmap = (
  data: WorkoutSet[],
  effectiveNow: Date,
  exerciseMuscleData: Map<string, ExerciseMuscleData>
): FlexHeadlessHeatmap =>
  useMemo(() => {
    const ytdStart = new Date(effectiveNow.getFullYear(), 0, 1);

    // Calculate weeks for averaging
    const daysSinceYtd = Math.max(1, differenceInCalendarDays(effectiveNow, ytdStart) + 1);
    const weeks = Math.max(1, daysSinceYtd / 7);

    const detailed = new Map<string, number>();
    const exerciseCache = new Map<string, ExerciseMuscleData | undefined>();

    const getExerciseData = (title: string): ExerciseMuscleData | undefined => {
      if (!title) return undefined;
      if (exerciseCache.has(title)) return exerciseCache.get(title);
      const exData = lookupExerciseMuscleData(title, exerciseMuscleData);
      exerciseCache.set(title, exData);
      return exData;
    };
    for (const s of data) {
      if (isWarmupSet(s)) continue;
      const d = s.parsedDate;
      if (!d) continue;
      if (d < ytdStart || d > effectiveNow) continue;

      const exerciseTitle = s.exercise_title || '';
      const exData = getExerciseData(exerciseTitle);
      const { volumes } = getExerciseMuscleVolumes(exData);

      volumes.forEach((w, svgId) => {
        detailed.set(svgId, (detailed.get(svgId) || 0) + w);
      });
    }

    // Convert to muscle volumes and calculate weekly averages
    const totalVolumes = toMuscleVolumeMap(detailed);
    const weeklyVolumes = new Map<string, number>();
    totalVolumes.forEach((total, muscleId) => {
      weeklyVolumes.set(muscleId, Math.round((total / weeks) * 10) / 10);
    });

    const maxVolume = Math.max(1, ...Array.from(weeklyVolumes.values()));
    return { volumes: weeklyVolumes, maxVolume };
  }, [data, effectiveNow, exerciseMuscleData]);
