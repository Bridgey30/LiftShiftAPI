import React, { useState } from 'react';
import { BodyMap, type BodyMapGender } from '../../bodyMap/BodyMap';
import { ExerciseThumbnail } from '../../common/ExerciseThumbnail';
import { getExerciseMuscleVolumes, lookupExerciseMuscleData, toMuscleVolumeMap, type ExerciseMuscleData } from '../../../utils/muscle/mapping';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import type { MuscleVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';
import { ChevronDown } from 'lucide-react';
import { stripExerciseSourceLabel } from '../../../utils/exercise/exerciseSourceLabel';
import { SEMI_FANCY_FONT } from '../../../utils/ui/uiConstants';

interface MuscleAnalysisExerciseListProps {
  contributingExercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number; strengthTrend: number | null; strengthLabel: string | null }>;
  assetsMap: Map<string, ExerciseAsset> | null;
  exerciseMuscleData: Map<string, ExerciseMuscleData>;
  totalSetsInWindow: number;
  volumeThresholds: MuscleVolumeThresholds;
  onExerciseClick?: (exerciseName: string) => void;
  bodyMapGender?: BodyMapGender;
  secondarySetMultiplier: number;
}

const INITIAL_DISPLAY_COUNT = 6;
const LAZY_LOAD_INCREMENT = 3;
const VISIBLE_COUNT = 3;

export const MuscleAnalysisExerciseList: React.FC<MuscleAnalysisExerciseListProps> = ({
  contributingExercises,
  assetsMap,
  exerciseMuscleData,
  totalSetsInWindow,
  volumeThresholds,
  onExerciseClick,
  bodyMapGender = 'male',
  secondarySetMultiplier,
}) => {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const displayedExercises = contributingExercises.slice(0, displayCount);
  const hasMore = displayCount < contributingExercises.length;

  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + LAZY_LOAD_INCREMENT, contributingExercises.length));
  };

  const mobileHeight = Math.min(displayCount, VISIBLE_COUNT) * 64;
  const desktopHeight = Math.min(displayCount, VISIBLE_COUNT) * 88;

  return (
    <div className="px-4 mt-2">
      <div>
        {displayedExercises.map((ex) => {
          const baseName = stripExerciseSourceLabel(ex.name);
          const asset = assetsMap?.get(baseName);
          const exData = lookupExerciseMuscleData(ex.name, exerciseMuscleData);
          const { volumes: exVolumes, maxVolume: exMaxVol } = getExerciseMuscleVolumes(exData, secondarySetMultiplier);
          const exMuscleVolumes = toMuscleVolumeMap(exVolumes);
          const exMuscleMaxVol = Math.max(1, ...(Array.from(exMuscleVolumes.values()) as number[]));
          const totalSetsForCalc = totalSetsInWindow || 1;
          const pct = totalSetsForCalc > 0 ? Math.round((ex.sets / totalSetsForCalc) * 100) : 0;

          const isPrimary = ex.primarySets > 0;
          const isSecondary = ex.secondarySets > 0;
          const primaryRounded = Math.round(ex.primarySets * 10) / 10;
          const secondaryRounded = Math.round(ex.secondarySets * 10) / 10;

          return (
            <button
              key={ex.name}
              onClick={() => onExerciseClick?.(ex.name)}
              type="button"
              className="group relative w-full text-left rounded-lg bg-black/20 p-2 transition-colors focus:outline-none border border-transparent hover:border-slate-600/40 cursor-pointer"
              title={ex.name}
            >
              <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr_5.25rem] items-stretch gap-2">
                <div className="flex items-center justify-center">
                  <div className="w-full aspect-square">
                    <ExerciseThumbnail
                      asset={asset}
                      className="h-full w-full rounded-md"
                      imageClassName="h-full w-full rounded-md object-cover bg-white"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                  <div className="text-sm font-semibold text-white truncate" style={SEMI_FANCY_FONT}>{ex.name}</div>

                  {ex.strengthLabel && (
                    <div className="my-0.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold ${
                          (ex.strengthTrend ?? 0) > 0 
                            ? 'bg-emerald-500/15 text-emerald-400' 
                            : (ex.strengthTrend ?? 0) < 0 
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {ex.strengthLabel}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1 text-[11px] sm:text-[10px]">
                    <div className="text-slate-400">
                      {pct}% of sets
                    </div>
                    {isPrimary && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] sm:text-[8px] font-semibold bg-emerald-500/15 text-emerald-200"
                        title={`${primaryRounded} direct set${primaryRounded === 1 ? '' : 's'}`}
                      >
                        {primaryRounded} direct
                      </span>
                    )}
                    {isSecondary && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] sm:text-[8px] font-semibold bg-sky-500/15 text-sky-200"
                        title={`${secondaryRounded} indirect set${secondaryRounded === 1 ? '' : 's'}`}
                      >
                        {secondaryRounded} indirect 
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex w-[5.25rem] justify-end">
                  <div className="h-full w-[5.25rem] rounded-md p-1">
                    <div className="h-full w-full flex items-center justify-center">
                      <BodyMap
                        onPartClick={() => { }}
                        selectedPart={null}
                        muscleVolumes={exMuscleVolumes}
                        maxVolume={exMuscleMaxVol}
                        volumeThresholds={volumeThresholds}
                        useExerciseColors
                        compact
                        compactFill
                        gender={bodyMapGender}
                        stroke={{ width: 5, color: '#484a68', opacity: 0.8 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {contributingExercises.length === 0 && (
          <div className="text-center text-slate-500 py-4">
            No exercises found
          </div>
        )}
        {hasMore && (
          <button
            onClick={handleShowMore}
            className="w-full py-2 mb-3 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-white transition-colors border border-dashed border-slate-700 rounded-lg hover:border-slate-500 cursor-pointer"
          >
            <ChevronDown className="w-3 h-3" />
            Show {Math.min(LAZY_LOAD_INCREMENT, contributingExercises.length - displayCount)} more
            <span className="text-slate-600">({contributingExercises.length - displayCount} remaining)</span>
          </button>
        )}
      </div>
    </div>
  );
};
