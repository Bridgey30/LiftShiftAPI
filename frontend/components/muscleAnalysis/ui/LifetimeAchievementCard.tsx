import React, { useMemo } from 'react';
import { Sprout, Leaf, TreePine, Hammer, Pickaxe, Gem, Target, Crown, Zap } from 'lucide-react';
import { formatNumber } from '../../../utils/format/formatters';
import { Tooltip, useTooltip } from '../../ui/Tooltip';
import {
  JOURNEY_TIERS,
  calculateAchievement,
  findTierByAchievement,
  getNextTier,
  estimateWeeksToNextTier,
  getTierColor,
  type TierDef,
} from '../../../utils/training/tierUtils';

/** Format weeks to human-readable string */
function formatEta(weeks: number | null): string {
  if (weeks === null || weeks <= 0) return 'Reached';
  if (weeks <= 1) return '~1 week';
  if (weeks < 6) return `~${weeks} weeks`;
  const months = Math.round(weeks / 4.33);
  if (months <= 1) return '~1 month';
  if (months < 12) return `~${months} months`;
  const years = Math.round((months / 12) * 10) / 10;
  if (years <= 1) return '~1 year';
  return `~${years} years`;
}

interface LifetimeAchievementData {
  overallPercent: number;
  overallTier: { key: string; label: string; description: string; color: string; hexColor: string };
  muscles: Array<{
    muscleId: string;
    name: string;
    lifetimeSets: number;
    weeklySets: number;
  }>;
  totalLifetimeSets: number;
}

interface LifetimeAchievementCardProps {
  data?: LifetimeAchievementData;
  muscles?: LifetimeAchievementCardProps['data'] extends never ? never : LifetimeAchievementData['muscles'];
  selectedMuscleId?: string | null;
  onMuscleClick?: (muscleId: string) => void;
}

const TIER_ICONS: Record<string, React.FC<{ className?: string }>> = {
  seedling: Sprout,
  sprout: Leaf,
  sapling: TreePine,
  foundation: Hammer,
  builder: Pickaxe,
  sculptor: Gem,
  elite: Target,
  master: Crown,
  legend: Zap,
};

const TierIcon: React.FC<{ tierKey: string; className?: string }> = ({
  tierKey,
  className = 'w-3 h-3',
}) => {
  const Icon = TIER_ICONS[tierKey] ?? Sprout;
  return <Icon className={className} />;
};

const ProgressBar: React.FC<{ percent: number; color: string }> = ({ percent, color }) => (
  <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(100, 100, 100, 0.1)' }}>
    <div
      className="h-full rounded-full transition-all duration-500 ease-out"
      style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
    />
  </div>
);

export const LifetimeAchievementCard: React.FC<LifetimeAchievementCardProps> = ({
  data,
  muscles: musclesProp,
  selectedMuscleId,
  onMuscleClick,
}) => {
  const { tooltip, showTooltip, hideTooltip } = useTooltip();

  // Support both data prop and direct muscles prop
  const muscles = data?.muscles ?? musclesProp ?? [];
  const overallPercent = data?.overallPercent ?? 0;
  const overallTier = data?.overallTier ?? JOURNEY_TIERS[0];
  const totalSets = data?.totalLifetimeSets ?? 0;

  const muscleData = useMemo(() => {
    return muscles.map(m => {
      const achievement = calculateAchievement(m.lifetimeSets);
      const tier = findTierByAchievement(achievement);
      const nextTier = getNextTier(achievement);
      const weeksToNext = nextTier ? estimateWeeksToNextTier(achievement, m.weeklySets) : null;
      
      return {
        ...m,
        achievement,
        tier,
        nextTier,
        weeksToNext,
      };
    });
  }, [muscles]);

  const overallData = useMemo(() => {
    const avgAchievement = muscleData.length > 0 
      ? muscleData.reduce((sum, m) => sum + m.achievement, 0) / muscleData.length
      : 0;
    return { avgAchievement };
  }, [muscleData]);

  const handleMouseEnter = (e: React.MouseEvent, m: typeof muscleData[0]) => {
    const timeText = m.weeksToNext ? formatEta(m.weeksToNext) : m.nextTier ? 'Max tier' : '';
    const etaText = timeText && m.nextTier ? `${timeText} to ${m.nextTier.label}` : timeText;
    
    showTooltip(e, {
      title: m.name,
      body: `${m.tier.description}\n\n${Math.round(m.achievement)}%${etaText ? ` · ${etaText}` : ''}`,
      status: 'info',
    });
  };

  return (
    <div className="bg-black/70 rounded-xl border border-slate-700/50 overflow-hidden h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="p-3 flex items-start gap-3 flex-shrink-0">
        <div className="relative flex-shrink-0">
          <svg width="56" height="56" className="transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              strokeWidth="5"
              stroke="rgba(100, 100, 100, 0.1)"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              strokeWidth="5"
              stroke={overallTier.hexColor}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - overallData.avgAchievement / 100)}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] font-bold text-white">
              {Math.round(overallData.avgAchievement)}%
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold truncate text-white">
              Lifetime Growth Unlocked
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${overallTier.color}`}
            >
              <TierIcon tierKey={overallTier.key} />
              {overallTier.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
            {overallTier.description}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {Math.round(overallData.avgAchievement)}% of lifetime gains achieved
            {totalSets > 0 && (
              <span className="text-slate-400"> · {formatNumber(Math.round(totalSets))} sets</span>
            )}
          </p>
        </div>
      </div>

      {/* Per-muscle breakdown */}
      <div className="px-3 pb-3 flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-2 pr-3">
          {muscleData.map((m) => {
            const isSelected = m.muscleId === selectedMuscleId;
            const color = getTierColor(m.tier.key);

            return (
              <div
                key={m.muscleId}
                className="flex items-center gap-2 rounded px-1 py-0.5 -mx-1 group relative lg:cursor-pointer"
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    onMuscleClick?.(m.muscleId);
                  }
                }}
                onMouseEnter={(e) => handleMouseEnter(e, m)}
                onMouseLeave={hideTooltip}
              >
                <span
                  className={`text-[10px] w-[15%] lg:w-[12%] truncate flex-shrink-0 ${
                    isSelected ? 'font-semibold text-white' : 'text-slate-500'
                  }`}
                >
                  {m.name}
                </span>
                <div className="w-[45%] lg:w-[55%]">
                  <ProgressBar percent={m.achievement} color={color} />
                </div>
                <span
                  className={`text-[10px] font-semibold w-[10%] text-right flex-shrink-0 ${
                    isSelected ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {Math.round(m.achievement)}%
                </span>
                <span
                  className={`text-[9px] flex items-center gap-1 w-[25%] lg:w-[12%] flex-shrink-0 ${m.tier.color}`}
                >
                  <span className="truncate">{m.tier.label}</span>
                  <TierIcon tierKey={m.tier.key} />
                </span>
                {m.weeksToNext && (
                  <span className="text-[9px] text-slate-500 w-[5%] lg:w-[5%] flex-shrink-0">
                    {formatEta(m.weeksToNext)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {tooltip && <Tooltip data={tooltip} />}
    </div>
  );
};
