import React, { Suspense } from 'react';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import { LazyRender } from '../../ui/LazyRender';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';

const TopExercisesCard = React.lazy(() => import('../topExercises/TopExercisesCard').then((m) => ({ default: m.TopExercisesCard })));

interface DashboardSecondaryChartsProps {
  topExerciseMode: 'all' | 'weekly' | 'monthly' | 'yearly';
  setTopExerciseMode: (v: 'all' | 'weekly' | 'monthly' | 'yearly') => void;
  topExercisesView: 'barh' | 'area';
  setTopExercisesView: (v: 'barh' | 'area') => void;
  topExercisesBarData: any[];
  topExercisesOverTimeData: any[];
  topExerciseNames: string[];
  topExercisesInsight: any;
  pieColors: string[];
  tooltipStyle: any;
  onExerciseClick?: (exerciseName: string) => void;
  assetsMap?: Map<string, ExerciseAsset> | null;
  assetsLowerMap?: Map<string, ExerciseAsset> | null;
}

export const DashboardSecondaryCharts: React.FC<DashboardSecondaryChartsProps> = ({
  topExerciseMode,
  setTopExerciseMode,
  topExercisesView,
  setTopExercisesView,
  topExercisesBarData,
  topExercisesOverTimeData,
  topExerciseNames,
  topExercisesInsight,
  pieColors,
  tooltipStyle,
  onExerciseClick,
  assetsMap,
  assetsLowerMap,
}) => (
  <div className="min-w-0">
    <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[360px]" />}>
      <Suspense fallback={<ChartSkeleton className="min-h-[360px]" />}>
        <TopExercisesCard
          topExerciseMode={topExerciseMode}
          setTopExerciseMode={setTopExerciseMode}
          topExercisesView={topExercisesView}
          setTopExercisesView={setTopExercisesView}
          topExercisesBarData={topExercisesBarData}
          topExercisesOverTimeData={topExercisesOverTimeData}
          topExerciseNames={topExerciseNames}
          topExercisesInsight={topExercisesInsight}
          pieColors={pieColors}
          tooltipStyle={tooltipStyle as any}
          onExerciseClick={onExerciseClick}
          assetsMap={assetsMap ?? null}
          assetsLowerMap={assetsLowerMap ?? null}
        />
      </Suspense>
    </LazyRender>
  </div>
);
