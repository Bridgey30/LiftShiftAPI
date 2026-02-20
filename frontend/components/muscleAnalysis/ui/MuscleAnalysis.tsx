import React, { useState, useEffect } from 'react';
import { WorkoutSet } from '../../../types';
import { ViewHeader } from '../../layout/ViewHeader';
import { Activity, Dumbbell } from 'lucide-react';
import { BodyMapGender } from '../../bodyMap/BodyMap';
import { useMuscleSelection } from '../hooks/useMuscleSelection';
import { useMuscleVolumeData } from '../hooks/useMuscleVolumeData';
import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import { useMuscleHeatmapData } from '../hooks/useMuscleHeatmapData';
import { useMuscleTrendData } from '../hooks/useMuscleTrendData';
import { useMuscleAnalysisHandlers } from '../hooks/useMuscleAnalysisHandlers';
import { useLifetimeAchievement } from '../hooks/useLifetimeAchievement';
import { MuscleAnalysisBodyMapPanel } from './MuscleAnalysisBodyMapPanel';
import { MuscleAnalysisGraphPanel } from './MuscleAnalysisGraphPanel';
import { MuscleAnalysisExerciseListPanel } from './MuscleAnalysisExerciseListPanel';
import { LifetimeAchievementCard } from './LifetimeAchievementCard';
import { TooltipData } from '../../ui/Tooltip';
import { prefetchHistoryData } from '../../../utils/prefetch/prefetchStrategies';

interface MuscleAnalysisProps {
  data: WorkoutSet[];
  filterCacheKey: string;
  filtersSlot?: React.ReactNode;
  onExerciseClick?: (exerciseName: string) => void;
  initialMuscle?: { muscleId: string; viewMode?: 'headless' } | null;
  initialWeeklySetsWindow?: WeeklySetsWindow | null;
  onInitialMuscleConsumed?: () => void;
  stickyHeader?: boolean;
  bodyMapGender?: BodyMapGender;
  now?: Date;
}

export const MuscleAnalysis: React.FC<MuscleAnalysisProps> = ({
  data,
  filterCacheKey,
  filtersSlot,
  onExerciseClick,
  initialMuscle,
  initialWeeklySetsWindow,
  onInitialMuscleConsumed,
  stickyHeader = false,
  bodyMapGender = 'male',
  now,
}) => {
  const [weeklySetsChartView, setWeeklySetsChartView] = useState<'heatmap' | 'radar'>('heatmap');
  const [hoverTooltip, setHoverTooltip] = useState<TooltipData | null>(null);

  const {
    selectedMuscle,
    setSelectedMuscle,
    weeklySetsWindow,
    setWeeklySetsWindow,
    selectedSvgIdForUrlRef,
    clearSelectionUrl,
    updateSelectionUrl,
    clearSelection,
  } = useMuscleSelection({
    initialMuscle,
    initialWeeklySetsWindow,
    onInitialMuscleConsumed,
    isLoading: false,
  });

  const {
    exerciseMuscleData,
    muscleVolume,
    isLoading,
    assetsMap,
    windowStart,
    effectiveNow,
    allTimeWindowStart,
    lifetimeHeadlessVolumes,
  } = useMuscleVolumeData({
    data,
    weeklySetsWindow,
    now,
  });

  // Prefetch History view data after 3 seconds on Muscle Analysis
  useEffect(() => {
    if (data.length === 0 || !effectiveNow) return;
    
    const timer = setTimeout(() => {
      prefetchHistoryData(filterCacheKey, data, effectiveNow);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [filterCacheKey, data, effectiveNow]);

  const {
    muscleVolumes,
    maxVolume,
    windowedGroupVolumes,
    groupedBodyMapVolumes,
    maxGroupVolume,
    selectedSubjectKeys,
    groupWeeklyRatesBySubject,
    headlessRatesMap,
    radarData,
  } = useMuscleHeatmapData({
    data,
    assetsMap,
    windowStart,
    effectiveNow,
    weeklySetsWindow,
    selectedMuscle,
    filterCacheKey,
  });

  const {
    weeklySetsSummary,
    legendMaxSets,
    trainingLevel,
    volumeThresholds,
    weeklySetsDelta,
    trendData,
    legendTrendData,
    windowedSelectionBreakdown,
    contributingExercises,
    totalSets,
    musclesWorked,
  } = useMuscleTrendData({
    data,
    assetsMap,
    windowStart,
    effectiveNow,
    allTimeWindowStart,
    weeklySetsWindow,
    selectedSubjectKeys,
    groupWeeklyRatesBySubject,
    headlessRatesMap,
    muscleVolume,
    windowedGroupVolumes,
    muscleVolumes,
    filterCacheKey,
  });
  const {
    handleMuscleClick,
    handleMuscleHover,
    selectedBodyMapIds,
    hoveredBodyMapIds,
  } = useMuscleAnalysisHandlers({
    selectedMuscle,
    setSelectedMuscle,
    selectedSvgIdForUrlRef,
    clearSelectionUrl,
    updateSelectionUrl,
    weeklySetsWindow,
    headlessRatesMap,
    setHoverTooltip,
    trainingLevel,
  });

  const lifetimeAchievementData = useLifetimeAchievement({
    lifetimeHeadlessVolumes,
    weeklyHeadlessVolumes: headlessRatesMap,
    selectedMuscle,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading muscle data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-slate-400 mb-2">No workout data for current filter</div>
        <div className="text-slate-500 text-sm">Try adjusting your date filter to see muscle analysis</div>
      </div>
    );
  }

  return (
    <div className="space-y-1 flex flex-col">
      <div className="hidden sm:contents">
        <ViewHeader
          leftStats={[{ icon: Activity, value: totalSets, label: 'Total Sets' }]}
          rightStats={[{ icon: Dumbbell, value: musclesWorked, label: 'Muscles' }]}
          filtersSlot={filtersSlot}
          sticky={stickyHeader}
        />
      </div>

      {/* Main layout: 3 columns on desktop, stacked on mobile */}
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-2 lg:h-[75vh] lg:min-h-0">
        {/* Column 1: Body Map (1/3 width, full height) */}
        <div className="h-[400px] sm:h-[450px] lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:h-full min-h-0">
          <MuscleAnalysisBodyMapPanel
            bodyMapGender={bodyMapGender}
            weeklySetsChartView={weeklySetsChartView}
            setWeeklySetsChartView={setWeeklySetsChartView}
            weeklySetsWindow={weeklySetsWindow}
            setWeeklySetsWindow={setWeeklySetsWindow}
            selectedSvgIdForUrlRef={selectedSvgIdForUrlRef}
            updateSelectionUrl={updateSelectionUrl}
            muscleVolumes={muscleVolumes}
            maxVolume={maxVolume}
            volumeThresholds={volumeThresholds}
            selectedMuscle={selectedMuscle}
            selectedBodyMapIds={selectedBodyMapIds}
            hoveredBodyMapIds={hoveredBodyMapIds}
            handleMuscleClick={handleMuscleClick}
            handleMuscleHover={handleMuscleHover}
            radarData={radarData}
            hoverTooltip={hoverTooltip}
          />
        </div>

        {/* Column 2: Weekly Sets Graph */}
        <div className="h-[300px] sm:h-[350px] lg:col-start-2 lg:row-start-1 lg:h-full min-h-0">
          <MuscleAnalysisGraphPanel
            selectedMuscle={selectedMuscle}
            weeklySetsWindow={weeklySetsWindow}
            weeklySetsSummary={weeklySetsSummary}
            legendMaxSets={legendMaxSets}
            volumeThresholds={volumeThresholds}
            volumeDelta={weeklySetsDelta}
            trendData={trendData}
            legendTrendData={legendTrendData}
            windowedSelectionBreakdown={windowedSelectionBreakdown}
            clearSelection={clearSelection}
          />
        </div>

        {/* Column 3: Exercise List */}
        <div className="h-[300px] sm:h-[350px] lg:col-start-3 lg:row-start-1 lg:h-full min-h-0">
          <MuscleAnalysisExerciseListPanel
            contributingExercises={contributingExercises}
            assetsMap={assetsMap}
            exerciseMuscleData={exerciseMuscleData}
            totalSetsInWindow={windowedSelectionBreakdown?.totalSetsInWindow ?? 0}
            volumeThresholds={volumeThresholds}
            onExerciseClick={onExerciseClick}
          />
        </div>

        {/* Bottom row: Lifetime Growth Unlocked (columns 2-3) */}
        {lifetimeAchievementData && (
          <div className="h-[300px] lg:h-full lg:col-start-2 lg:col-span-2 lg:row-start-2 min-h-0">
            <LifetimeAchievementCard
              data={lifetimeAchievementData}
              selectedMuscleId={selectedMuscle}
              onMuscleClick={handleMuscleClick}
            />
          </div>
        )}
      </div>
    </div>
  );
};
