import React from 'react';
import { Dumbbell, Trophy, BarChart3, Repeat, Target, Layers, Route, type LucideIcon } from 'lucide-react';

import type { RecentPR } from '../../utils/analysis/insights';
import type { PrType } from '../../types';
import type { ExerciseAsset } from '../../utils/data/exerciseAssets';
import type { WeightUnit } from '../../utils/storage/localStorage';
import { convertWeight, convertVolume, formatDistance } from '../../utils/format/units';
import { formatHumanReadableDate } from '../../utils/date/dateUtils';
import { ExerciseThumbnail } from '../common/ExerciseThumbnail';
import { SEMI_FANCY_FONT } from '../../utils/ui/uiConstants';

interface PrTypeMeta {
  icon: LucideIcon;
  label: string;
  value: (weight: number, reps: number, weightUnit: WeightUnit) => string;
}

const PR_TYPE_META: Record<PrType, PrTypeMeta> = {
  weight: {
    icon: Dumbbell,
    label: 'Weight',
    value: (weight, _reps, weightUnit) => `${convertWeight(weight, weightUnit)}${weightUnit}`,
  },
  oneRm: {
    icon: Trophy,
    label: '1RM',
    value: (weight, _reps, weightUnit) => `${convertWeight(weight, weightUnit)}${weightUnit}`,
  },
  volume: {
    icon: BarChart3,
    label: 'Set Vol',
    value: (weight, _reps, weightUnit) => `${convertWeight(weight, weightUnit)}${weightUnit}`,
  },
  reps: {
    icon: Repeat,
    label: 'Rep',
    value: (weight, reps, weightUnit) =>
      weight > 0 ? `${convertWeight(weight, weightUnit)}${weightUnit} × ${reps}` : `${reps} reps`,
  },
  weightedReps: {
    icon: Target,
    label: 'Weighted Rep',
    value: (weight, reps, weightUnit) => `${convertWeight(weight, weightUnit)}${weightUnit} × ${reps}`,
  },
  sessionVolume: {
    icon: Layers,
    label: 'Session Vol',
    value: (weight, _reps, weightUnit) => `${convertVolume(weight, weightUnit)}${weightUnit}`,
  },
  distance: {
    icon: Route,
    label: 'Distance',
    value: (weight, _reps, weightUnit) => formatDistance(weight, weightUnit),
  },
};

// Recent PR Card with image and improvement
interface RecentPRCardProps {
  pr: RecentPR;
  isLatest?: boolean;
  asset?: ExerciseAsset;
  weightUnit?: WeightUnit;
  now?: Date;
  onExerciseClick?: (exerciseName: string) => void;
}

export const RecentPRCard: React.FC<RecentPRCardProps> = ({
  pr,
  isLatest,
  asset,
  weightUnit = 'kg',
  now,
  onExerciseClick,
}) => {
  const { exercise, weight, reps, date, isSilver, type } = pr;
  const clickable = typeof onExerciseClick === 'function';

  const isToday = now ? date.toDateString() === now.toDateString() : false;

  const meta = PR_TYPE_META[type] ?? PR_TYPE_META.weight;
  const PrIcon = meta.icon;
  const iconColor = isSilver ? 'text-slate-300' : 'text-yellow-400';

  const cardClass = isSilver
    ? (isLatest ? 'bg-slate-500/15 border border-slate-500/40' : 'bg-black/20')
    : (isLatest ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-black/20');

  const improvementClass = isSilver ? 'text-slate-300' : 'text-yellow-400';

  return (
    <button
      type="button"
      onClick={() => onExerciseClick?.(exercise)}
      disabled={!clickable}
      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left ${cardClass} ${clickable ? 'cursor-pointer border border-transparent hover:border-slate-600/40 transition-colors' : 'cursor-default'}`}
    >
      <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden">
        <ExerciseThumbnail
          asset={asset}
          className="w-full h-full"
          imageClassName="w-full h-full object-cover bg-white"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[color:var(--text-primary)] truncate" style={SEMI_FANCY_FONT}>{exercise}</div>
        <div className={`text-[11px] sm:text-xs ${isToday ? 'text-yellow-400 font-bold' : 'text-slate-500'}`}>{formatHumanReadableDate(date, { now })}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-[color:var(--text-primary)] whitespace-nowrap">{meta.value(weight, reps, weightUnit)}</div>
        <div className={`text-[11px] sm:text-xs font-bold ${improvementClass} flex items-center justify-end gap-1`}>
          <PrIcon className={`w-3 h-3 ${iconColor}`} />
          {meta.label} PR{isSilver ? ' (1mo)' : ''}
        </div>
      </div>
    </button>
  );
};
