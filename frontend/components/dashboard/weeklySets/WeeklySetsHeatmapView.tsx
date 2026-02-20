import React from 'react';
import { BodyMap, type BodyMapGender } from '../../bodyMap/BodyMap';
import { LazyRender } from '../../ui/LazyRender';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import type { MuscleVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';

interface HeatmapData {
  volumes: Map<string, number>;
  maxVolume: number;
}

interface WeeklySetsHeatmapViewProps {
  heatmap: HeatmapData;
  headlessVolumes: Map<string, number>;
  heatmapHoveredMuscleIds?: string[];
  onBodyMapClick: (muscleId: string) => void;
  bodyMapGender?: BodyMapGender;
  onMuscleHover?: (muscleId: string | null, e?: MouseEvent) => void;
  volumeThresholds: MuscleVolumeThresholds;
}

export const WeeklySetsHeatmapView: React.FC<WeeklySetsHeatmapViewProps> = ({
  heatmap,
  headlessVolumes,
  heatmapHoveredMuscleIds,
  onBodyMapClick,
  bodyMapGender,
  onMuscleHover,
  volumeThresholds,
}) => {

  return (
    <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 300 }} />}>
      <div className="flex flex-col items-center justify-center h-[300px]">
        {heatmap.volumes.size === 0 ? (
          <div className="text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg p-8">
            No heatmap data for this period yet.
          </div>
        ) : (
          <div className="relative flex justify-center w-full mt-4 sm:mt-6">
            <div className="transform scale-[0.65] origin-center">
              <BodyMap
                onPartClick={onBodyMapClick}
                selectedPart={null}
                muscleVolumes={headlessVolumes}
                maxVolume={Math.max(1, ...(Array.from(headlessVolumes.values()) as number[]))}
                hoveredMuscleIdsOverride={heatmapHoveredMuscleIds}
                onPartHover={onMuscleHover}
                gender={bodyMapGender}
                viewMode="headless"
                volumeThresholds={volumeThresholds}
              />
            </div>
          </div>
        )}
      </div>
    </LazyRender>
  );
};
