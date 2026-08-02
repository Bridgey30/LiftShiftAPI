
import React, { memo, useMemo } from 'react';

import { Dumbbell, Trophy } from 'lucide-react';
import { WeeklySetsBodyIcon } from '../dashboard/weeklySets/WeeklySetsIcons';

import type { DashboardInsights } from '../../utils/analysis/insights';
import { KPICard } from './KPICard';
import { getDisplayVolume } from '../../utils/format/volumeDisplay';
import type { WeightUnit } from '../../utils/storage/localStorage';
import type { WeeklySetsDashboardResult } from '../../utils/muscle/analytics/dashboardWeeklySets';

// Main Insights Panel Component
interface InsightsPanelProps {
  insights: DashboardInsights;
  totalPRs: number;
  weightUnit: WeightUnit;
  weeklySetsDashboard: WeeklySetsDashboardResult | null;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = memo(function InsightsPanel(props) {
  const {
    insights,
    totalPRs,
    weightUnit,
    weeklySetsDashboard,
  } = props;
  const { rolling7d, weeklyVolumeSparkline, prSparkline, muscleAvgSparkline } = insights;

  const displayVolume = getDisplayVolume(rolling7d.current.totalVolume, weightUnit, { round: 'int' });
  const volumeUnit = weightUnit === 'kg' ? 'kg' : 'lbs';

  const weeklySetsAvg = useMemo(() => {
    if (!weeklySetsDashboard) return 0;
    const volumes = weeklySetsDashboard.heatmap.volumes;
    let sum = 0;
    let count = 0;
    for (const v of volumes.values()) {
      if (v > 0) { sum += v; count++; }
    }
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  }, [weeklySetsDashboard]);

  return (
    <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
      {/* PRs */}
      <KPICard
        title="PRs"
        value={totalPRs}
        subtitle="total"
        icon={Trophy}
        iconColor="text-yellow-400"
        delta={rolling7d.prs ?? undefined}
        deltaContext="vs lst wk"
        sparkline={prSparkline}
        sparklineColor="#eab308"
        sparklineTitle="Personal records over last 4 weeks"
      />

      {/* Volume - desktop only */}
      <div className="hidden lg:block">
        <KPICard
          title="Volume"
          value={displayVolume}
          subtitle={`${volumeUnit} lst 7d`}
          icon={Dumbbell}
          iconColor="text-purple-400"
          delta={rolling7d.volume ?? undefined}
          deltaContext="vs lst wk"
          sparkline={weeklyVolumeSparkline}
          sparklineColor="#a855f7"
          sparklineTitle="Weekly volume over last 4 weeks"
        />
      </div>

      {/* Weekly Sets */}
      <KPICard
        title="Weekly Sets"
        value={weeklySetsAvg}
        subtitle="sets / muscle"
        icon={WeeklySetsBodyIcon}
        iconColor="text-cyan-400"
        delta={rolling7d.sets ?? undefined}
        deltaContext="vs lst wk"
        sparkline={muscleAvgSparkline}
        sparklineColor="#22c55e"
        sparklineTitle="Average sets per exercise over last 4 weeks"
      />
    </div>
  );
});
