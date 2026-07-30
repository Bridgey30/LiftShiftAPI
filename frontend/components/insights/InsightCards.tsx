import React from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';
import { PRInsights } from '../../utils/analysis/insights';
import { Sparkline } from './Sparkline';
import { StreakBadge } from './StreakBadge';

export { Sparkline, StreakBadge };

export { KPICard } from './KPICard';
export { AIAnalysisCard } from './AIAnalysisCard';
export { InsightsPanel } from './InsightsPanel';
export { PlateauAlert } from './PlateauAlert';
export { RecentPRCard } from './RecentPRCard';
export { RecentPRsPanel } from './RecentPRsPanel';

// PR Status Badge
const PRStatusBadge: React.FC<{ prInsights: PRInsights }> = ({ prInsights }) => {
  const { daysSinceLastPR, prDrought } = prInsights;

  if (daysSinceLastPR < 0) {
    return (
      <span className="text-[10px] text-slate-500 font-medium">Chase your first PR</span>
    );
  }

  if (prDrought) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-amber-400 whitespace-nowrap">{daysSinceLastPR}d drought</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <Trophy className="w-3 h-3 text-emerald-400 flex-shrink-0" />
      <span className="text-[10px] font-semibold text-emerald-400 whitespace-nowrap">
        {daysSinceLastPR === 0 ? 'PR today!' : `${daysSinceLastPR}d ago`}
      </span>
    </div>
  );
};

// Consistency Score Ring
const ConsistencyRing: React.FC<{ score: number; size?: number }> = ({ score, size = 40 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    if (s >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--border-rgb) / 0.5)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-slate-200 leading-none">{score}%</span>
      </div>
    </div>
  );
};

// Local definitions of sub-components removed to favor separate file imports (PlateauAlert, RecentPRCard, RecentPRsPanel).
