import React from 'react';
import { BodyMap, BodyMapGender } from '../../bodyMap/BodyMap';
import { lookupExerciseMuscleData, type ExerciseMuscleData } from '../../../utils/muscle/mapping';
import { toMuscleVolumeMap } from '../../../utils/muscle/mapping';
import { MUSCLE_NAMES } from '../../../utils/muscle/mapping';
import { buildExerciseMuscleHeatmap } from '../utils/muscleHeatmaps';
import type { GroupedExercise } from '../utils/historySessions';
import type { TooltipState } from './HistoryTooltipPortal';

interface HistoryExerciseHeatmapProps {
  group: GroupedExercise;
  exerciseMuscleData: Map<string, ExerciseMuscleData>;
  bodyMapGender: BodyMapGender;
  setTooltip: (state: TooltipState | null) => void;
}

export const HistoryExerciseHeatmap: React.FC<HistoryExerciseHeatmapProps> = ({
  group,
  exerciseMuscleData,
  bodyMapGender,
  setTooltip,
}) => {
  const exData = lookupExerciseMuscleData(group.exerciseName, exerciseMuscleData);
  const { volumes } = buildExerciseMuscleHeatmap(group.sets, exData);

  if (volumes.size === 0) return null;

  const muscleVolumes = toMuscleVolumeMap(volumes);
  const muscleMaxVolume = Math.max(1, ...(Array.from(muscleVolumes.values()) as number[]));

  return (
    <div className="hidden sm:flex flex-col flex-shrink-0 pl-3 py-2 border-l border-slate-800/50 self-stretch">
      <div className="flex-1 w-52 md:w-60 flex items-center justify-center">
        <BodyMap
          onPartClick={() => { }}
          selectedPart={null}
          muscleVolumes={muscleVolumes}
          maxVolume={muscleMaxVolume}
          compact
          compactFill
          interactive
          gender={bodyMapGender}
          stroke={{ width: 5, color: '#484a68', opacity: 0.8 }}
          onPartHover={(muscleId, ev) => {
            if (!muscleId || !ev) {
              setTooltip(null);
              return;
            }
            const hoveredEl = (ev.target as Element | null)?.closest('g[id]');
            const rect = hoveredEl?.getBoundingClientRect();
            if (!rect) return;
            const label = (MUSCLE_NAMES as any)[muscleId] || muscleId;
            const sets = muscleVolumes.get(muscleId) || 0;
            const setsText = Number.isInteger(sets) ? `${sets}` : `${sets.toFixed(1)}`;
            setTooltip({ rect, title: label, body: `${setsText} sets`, status: 'info' });
          }}
        />
      </div>
    </div>
  );
};
