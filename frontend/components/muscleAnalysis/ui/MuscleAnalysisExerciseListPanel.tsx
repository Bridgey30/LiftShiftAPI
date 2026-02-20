import React from 'react';
import { MuscleAnalysisExerciseList } from './MuscleAnalysisExerciseList';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import type { ExerciseMuscleData } from '../../../utils/muscle/mapping';
import type { MuscleVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';

interface MuscleAnalysisExerciseListPanelProps {
  contributingExercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number }>;
  assetsMap: Map<string, ExerciseAsset> | null;
  exerciseMuscleData: Map<string, ExerciseMuscleData>;
  totalSetsInWindow: number;
  volumeThresholds: MuscleVolumeThresholds;
  onExerciseClick?: (exerciseName: string) => void;
}

export const MuscleAnalysisExerciseListPanel: React.FC<MuscleAnalysisExerciseListPanelProps> = React.memo(({
  contributingExercises,
  assetsMap,
  exerciseMuscleData,
  totalSetsInWindow,
  volumeThresholds,
  onExerciseClick,
}) => {
  return (
    <div className="bg-black/70 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-full min-h-0">
      <div className="bg-black/70  p-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Exercises</span>
          <span className="text-xs text-slate-500">
            {contributingExercises.length} total
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <MuscleAnalysisExerciseList
          contributingExercises={contributingExercises}
          assetsMap={assetsMap}
          exerciseMuscleData={exerciseMuscleData}
          totalSetsInWindow={totalSetsInWindow}
          volumeThresholds={volumeThresholds}
          onExerciseClick={onExerciseClick}
        />
      </div>
    </div>
  );
});

MuscleAnalysisExerciseListPanel.displayName = 'MuscleAnalysisExerciseListPanel';
