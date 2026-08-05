import React, { useMemo } from 'react';
import { ExerciseTrendStatus } from '../../../utils/analysis/exerciseTrend';
import type { UseExerciseFiltersReturn } from '../hooks/useExerciseFilters';
import type { LoadProgressionDirection } from '../../../utils/exercise/loadProgression';

interface ExerciseViewHeaderProps {
  filtersSlot?: React.ReactNode;
  stickyHeader?: boolean;
  loadDirectionMode?: LoadProgressionDirection;
  trainingStructure: UseExerciseFiltersReturn['trainingStructure'];
  trendFilter: ExerciseTrendStatus | null;
  setTrendFilter: (filter: ExerciseTrendStatus | null) => void;
}

export const ExerciseViewHeader: React.FC<ExerciseViewHeaderProps> = ({
  filtersSlot,
  stickyHeader = false,
  loadDirectionMode = 'higher',
  trainingStructure,
  trendFilter,
  setTrendFilter,
}) => {
  const positiveLabel = loadDirectionMode === 'lower' ? 'Easier' : 'Gaining';
  const negativeLabel = loadDirectionMode === 'lower' ? 'Harder' : 'Losing';

  const headerCenterSlot = useMemo(() => {
    if (trainingStructure.activeCount <= 0) return filtersSlot;

    const isSelected = (s: ExerciseTrendStatus) => trendFilter === s;
    const chipCls = (s: ExerciseTrendStatus, tone: 'good' | 'warn' | 'bad' | 'info') => {
      const base = 'text-[11px] sm:text-xs px-2.5 py-1 rounded-full font-semibold border border-white/20 whitespace-nowrap transition-all duration-200 tracking-wide';
      const selected = isSelected(s);

      if (selected) {
        if (tone === 'good') return `${base} bg-emerald-500/20 ring-1 ring-emerald-800 text-emerald-200 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]`;
        if (tone === 'warn') return `${base} bg-amber-500/20 ring-1 ring-amber-800 text-amber-200 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]`;
        if (tone === 'bad') return `${base} bg-rose-500/20 ring-1 ring-rose-800 text-rose-200 border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.15)]`;
        return `${base} bg-blue-500/20 ring-1 ring-blue-800 text-blue-20  border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.15)]`;
      }

      if (tone === 'good') return `${base} bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20 hover:border-emerald-400/40 hover:bg-emerald-500/15`;
      if (tone === 'warn') return `${base} bg-amber-500/10 text-amber-400/80 border-amber-500/20 hover:border-amber-400/40 hover:bg-amber-500/15`;
      if (tone === 'bad') return `${base} bg-rose-500/10 text-rose-400/80 border-rose-500/20 hover:border-rose-400/40 hover:bg-rose-500/15`;
      return `${base} bg-blue-500/10 text-blue-400/80 border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-500/15`;
    };

    const toggle = (s: ExerciseTrendStatus) => {
      setTrendFilter(trendFilter === s ? null : s);
    };

    return (
      <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 justify-start min-w-0">
          <span className="text-xs text-slate-200 font-semibold whitespace-nowrap">
            {trainingStructure.activeCount} active exercises
          </span>
          <button type="button" onClick={() => toggle('overload')} className={`${chipCls('overload', 'good')} cursor-pointer`}>
            {trainingStructure.overloadCount} {positiveLabel}
          </button>
          <button type="button" onClick={() => toggle('stagnant')} className={`${chipCls('stagnant', 'warn')} cursor-pointer`}>
            {trainingStructure.plateauCount} Plateauing
          </button>
          <button type="button" onClick={() => toggle('regression')} className={`${chipCls('regression', 'bad')} cursor-pointer`}>
            {trainingStructure.regressionCount} {negativeLabel}
          </button>
        </div>

        <div className="justify-self-center">{filtersSlot}</div>
      </div>
    );
  }, [filtersSlot, trainingStructure.activeCount, trainingStructure.overloadCount, trainingStructure.plateauCount, trainingStructure.regressionCount, trendFilter, setTrendFilter, positiveLabel, negativeLabel]);

  return (
    <>
      <div className="sm:hidden">
        <div className="bg-black/20 p-1 rounded-xl">
          {trainingStructure.activeCount > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setTrendFilter(null)}
                className={`w-full text-center text-[11px] sm:text-xs px-2 py-1 rounded-full font-semibold border whitespace-nowrap transition-all duration-200 cursor-pointer tracking-wide ${trendFilter === null ? 'bg-slate-500/20 text-slate-200 border-slate-400/50 shadow-[0_0_12px_rgba(100,116,139,0.15)]' : 'bg-slate-500/8 text-slate-400/80 border-slate-500/20 hover:border-slate-400/40 hover:bg-slate-500/15'}`}
              >
                {trainingStructure.activeCount} active
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter(trendFilter === 'overload' ? null : 'overload')}
                className={`w-full text-center text-[11px] sm:text-xs px-2 py-1 rounded-full font-semibold border whitespace-nowrap transition-all duration-200 cursor-pointer tracking-wide ${trendFilter === 'overload' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'bg-emerald-500/8 text-emerald-400/80 border-emerald-500/20 hover:border-emerald-400/40 hover:bg-emerald-500/15'}`}
              >
                {trainingStructure.overloadCount} {positiveLabel}
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter(trendFilter === 'stagnant' ? null : 'stagnant')}
                className={`w-full text-center text-[10.5px] sm:text-xs px-2 py-1 rounded-full font-semibold border whitespace-nowrap transition-all duration-200 cursor-pointer tracking-wide ${trendFilter === 'stagnant' ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]' : 'bg-amber-500/8 text-amber-400/80 border-amber-500/20 hover:border-amber-400/40 hover:bg-amber-500/15'}`}
              >
                {trainingStructure.plateauCount} Plateauing
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter(trendFilter === 'regression' ? null : 'regression')}
                className={`w-full text-center text-[11px] sm:text-xs px-2 py-1 rounded-full font-semibold border whitespace-nowrap transition-all duration-200 cursor-pointer tracking-wide ${trendFilter === 'regression' ? 'bg-rose-500/20 text-rose-200 border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.15)]' : 'bg-rose-500/8 text-rose-400/80 border-rose-500/20 hover:border-rose-400/40 hover:bg-rose-500/15'}`}
              >
                {trainingStructure.regressionCount} {negativeLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden sm:contents">
        <div className={`${stickyHeader ? 'sticky top-0 z-30' : ''} bg-black/20 px-2 sm:px-3 rounded-xl mt-1`}>
          {headerCenterSlot}
        </div>
      </div>
    </>
  );
};
