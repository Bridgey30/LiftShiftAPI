import React from 'react';
import { AlertTriangle, Award, BarChart3, Info, Repeat, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import type { AnalysisResult, WorkoutSet, PrType } from '../../../types';
import { getSetTypeConfig } from '../../../utils/analysis/classification';
import { convertWeight } from '../../../utils/format/units';
import { formatSignedNumber } from '../../../utils/format/formatters';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { ExerciseBestEvent, ExerciseVolumePrEvent } from '../utils/historyViewTypes';
import { getLoadProgressionDirection } from '../../../utils/exercise/loadProgression';
import { PR_PRIORITY } from '../../../utils/analysis/core/prCalculation';

// Session-granularity PR kinds (sessionVolume, distance) never mark individual sets,
// so they have no set-level badge.
const PR_BADGE_META: Partial<Record<PrType, { icon: typeof Trophy; gold: string; silver: string }>> = {
  weight: { icon: Trophy, gold: 'PR', silver: 'Lst 1 mo PR' },
  oneRm: { icon: Award, gold: '1RM PR', silver: 'Lst 1 mo 1RM PR' },
  volume: { icon: BarChart3, gold: 'Set Vol PR', silver: '1-Mo Set Vol PR' },
  reps: { icon: Repeat, gold: 'Rep PR', silver: '1-Mo Rep PR' },
  weightedReps: { icon: Target, gold: 'Wt-Rep PR', silver: '1-Mo Wt-Rep PR' },
};

interface HistorySetRowProps {
  set: WorkoutSet;
  setIndex: number;
  weightUnit: WeightUnit;
  insight?: AnalysisResult;
  workingSetNumber: number;
  isWorking: boolean;
  prEventsForSession: ExerciseBestEvent[];
  volPrEvent: ExerciseVolumePrEvent | null;
  volPrAnchorIndex: number;
  onTooltipToggle: (e: React.MouseEvent, data: any, variant: 'set' | 'macro') => void;
  onMouseEnter: (e: React.MouseEvent, data: any, variant: 'set' | 'macro') => void;
  onClearTooltip: () => void;
}

export const HistorySetRow: React.FC<HistorySetRowProps> = ({
  set,
  setIndex,
  weightUnit,
  insight,
  workingSetNumber,
  isWorking,
  prEventsForSession,
  volPrEvent,
  volPrAnchorIndex,
  onTooltipToggle,
  onMouseEnter,
  onClearTooltip,
}) => {
  const setConfig = getSetTypeConfig(set);
  const isLowerWeightBetter = getLoadProgressionDirection(set.exercise_title) === 'lower';

  let rowStatusClass = 'border-transparent';
  let dotClass = 'bg-black/20 border-slate-700';
  let isPrRow = false;

  const prDelta = (() => {
    if (!set.isPr || !set.parsedDate) return 0;
    const ev = prEventsForSession.find(
      (p) => p.date.getTime() === set.parsedDate!.getTime() && p.weight === set.weight_kg
    );
    if (!ev) return 0;
    const deltaKg = isLowerWeightBetter
      ? (ev.previousBest - set.weight_kg)
      : (set.weight_kg - ev.previousBest);
    return deltaKg > 0 ? deltaKg : 0;
  })();

  if (set.isPr) {
    isPrRow = true;
    rowStatusClass = 'border-yellow-500/30';
    dotClass = 'bg-yellow-500 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
  } else if (set.isSilverPr) {
    isPrRow = true;
    rowStatusClass = 'border-slate-500/30';
    dotClass = 'bg-slate-500 border-slate-400 shadow-[0_0_10px_rgba(100,116,139,0.5)]';
  } else if (insight?.status === 'danger') {
    rowStatusClass = 'bg-rose-500/5 border-rose-500/20';
    dotClass = 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
  } else if (insight?.status === 'success') {
    rowStatusClass = 'bg-emerald-500/5 border-emerald-500/20';
    dotClass = 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
  } else if (insight?.status === 'warning') {
    rowStatusClass = 'bg-orange-500/5 border-orange-500/20';
    dotClass = 'bg-orange-500 border-orange-400';
  }

  const prShimmerStyle: React.CSSProperties = isPrRow ? (set.isPr ? {
    background: 'linear-gradient(90deg, transparent 0%, rgba(234,179,8,0.08) 25%, rgba(234,179,8,0.15) 50%, rgba(234,179,8,0.08) 75%, transparent 100%)',
    backgroundSize: '200% 100%',
    animation: 'prRowShimmer 3s ease-in-out infinite',
  } : {
    background: 'linear-gradient(90deg, transparent 0%, rgba(100,116,139,0.08) 25%, rgba(100,116,139,0.15) 50%, rgba(100,116,139,0.08) 75%, transparent 100%)',
    backgroundSize: '200% 100%',
    animation: 'prRowShimmer 3s ease-in-out infinite',
  }) : {};

  const handleRowMouseEnter = (e: React.MouseEvent) => {
    if (insight) {
      onMouseEnter(e, insight, 'set');
    }
  };

  const handleRowMouseLeave = (e: React.MouseEvent) => {
    if (insight) {
      onClearTooltip();
    }
  };

  const showLegacyVolBadge = !!(volPrEvent && setIndex === volPrAnchorIndex && !set.prTypes?.includes('volume'));

  const badges: { prType: PrType; legacy?: boolean }[] = [
    ...(set.isPr ? set.prTypes : set.silverPrTypes)?.map((prType) => ({ prType })) ?? [],
    ...(showLegacyVolBadge ? [{ prType: 'volume' as PrType, legacy: true }] : []),
  ]
    .sort((a, b) => PR_PRIORITY[a.prType] - PR_PRIORITY[b.prType])
    .slice(0, 3);

  return (
    <div
      className={`relative z-10 flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg border ${rowStatusClass} transition-all hover:bg-black/60 group overflow-visible ${insight ? 'cursor-help' : ''}`}
      style={prShimmerStyle}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
    >
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold border-2 transition-all text-white ${set.isPr
          ? dotClass
          : isWorking && !setConfig.shortLabel
            ? dotClass
            : `${setConfig.bgColor} ${setConfig.borderColor}`
          }`}
        title={setConfig.description}
      >
        {setConfig.shortLabel || (isWorking ? workingSetNumber : '?')}
      </div>

      <div className="flex-1 flex justify-between items-center min-w-0">
        <div className="flex items-baseline gap-0.5 sm:gap-1 min-w-0">
          <span className="text-[clamp(12px,4.2vw,20px)] font-bold text-white tabular-nums tracking-tight">
            {convertWeight(set.weight_kg, weightUnit)}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{weightUnit}</span>
          <span className="text-slate-700 mx-0.5 sm:mx-1">×</span>
          <span className="text-[clamp(12px,4.2vw,20px)] font-bold text-slate-200 tabular-nums tracking-tight">
            {set.reps}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium">reps</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-none pl-2 overflow-hidden">
          {(set.isPr || set.isSilverPr || (volPrEvent && setIndex === volPrAnchorIndex)) && (
            <div className="flex flex-col gap-0.5">
              {badges.map((badge) => {
                if (badge.legacy) {
                  return (
                    <span
                      key="legacy-vol"
                      className={`flex items-center gap-0.5 px-0.5 py-0.5 rounded text-[6px] sm:text-[8px] font-bold uppercase tracking-wider whitespace-nowrap leading-none border animate-pulse ${set.isPr ? 'bg-amber-200/70 text-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 border-amber-300/80 dark:border-yellow-500/20' : 'bg-slate-200/70 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-300/80 dark:border-slate-500/20'}`}
                      title="Volume PR (best-ever single-set volume)"
                      aria-label="Volume PR (best-ever single-set volume)"
                    >
                      <BarChart3 className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-none" />
                      <span>Vol PR</span>
                      {volPrEvent!.previousBest > 0 && (
                        <span className="text-[4px] sm:text-[6px] font-extrabold text-yellow-500 dark:text-yellow-300 leading-none">
                          {formatSignedNumber(((volPrEvent!.volume - volPrEvent!.previousBest) / volPrEvent!.previousBest) * 100, { maxDecimals: 0 })}%
                        </span>
                      )}
                    </span>
                  );
                }

                const meta = PR_BADGE_META[badge.prType] ?? PR_BADGE_META.weight!;
                const Icon = meta.icon;
                const label = set.isPr ? meta.gold : meta.silver;

                return (
                  <span key={badge.prType} className={`flex items-center gap-0.5 px-0.5 py-0.5 rounded text-[6px] sm:text-[8px] font-bold uppercase tracking-wider whitespace-nowrap leading-none border animate-pulse ${set.isPr ? 'bg-amber-200/70 text-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 border-amber-300/80 dark:border-yellow-500/20' : 'bg-slate-200/70 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-300/80 dark:border-slate-500/20'}`}>
                    <Icon className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-none" />
                    <span>{label}</span>
                    {badge.prType === 'weight' && prDelta > 0 && (
                      <span className={`text-[4px] sm:text-[6px] font-extrabold leading-none ${set.isPr ? 'text-yellow-500' : 'text-slate-500'}`}>
                        {formatSignedNumber(convertWeight(prDelta, weightUnit), { maxDecimals: 2 })}{weightUnit}{isLowerWeightBetter ? ' less assist' : ''}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {insight && (
            <button
              type="button"
              onClick={(e) => onTooltipToggle(e, insight, 'set')}
              className="cursor-help flex items-center justify-center w-6 h-6 rounded hover:bg-black/60 transition-colors"
              aria-label={insight.shortMessage}
            >
              {insight.status === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
              {insight.status === 'success' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
              {insight.status === 'warning' && <TrendingDown className="w-4 h-4 text-amber-500" />}
              {insight.status === 'info' && <Info className="w-4 h-4 text-blue-500" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
