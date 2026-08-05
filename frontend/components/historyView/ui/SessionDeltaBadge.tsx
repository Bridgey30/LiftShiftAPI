import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../../../utils/format/deltaFormat';

interface SessionDeltaBadgeProps {
  current: number;
  previous: number;
  suffix?: string;
  label: string;
  context?: string;
  onClick?: () => void;
}

export const SessionDeltaBadge: React.FC<SessionDeltaBadgeProps> = ({
  current,
  previous,
  suffix = '',
  label,
  context = 'vs lst',
  onClick,
}) => {
  const delta = current - previous;
  if (delta === 0 || previous === 0) return null;

  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
  const deltaPercent = Math.round((delta / previous) * 100);

  const formattedPercent = formatDeltaPercentage(deltaPercent, getDeltaFormatPreset('badge'));

  const content = (
    <>
      <Icon className={`w-3 h-3 ${colorClass}`} />
      <span>{formattedPercent}{suffix}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`relative -top-[2px] inline-flex items-center gap-0.5 ml-1 text-[10px] sm:text-xs font-bold leading-none ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
        title={`${deltaPercent}% ${label} ${context} — click to view`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`relative -top-[2px] inline-flex items-center gap-0.5 ml-1 text-[10px] sm:text-xs font-bold leading-none ${colorClass}`}
      title={`${deltaPercent}% ${label} ${context}`}
    >
      {content}
    </span>
  );
};
