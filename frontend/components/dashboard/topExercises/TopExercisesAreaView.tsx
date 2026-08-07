import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LazyRender } from '../../ui/LazyRender';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import { getRechartsXAxisInterval, RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, formatAxisNumber } from '../../../utils/chart/chartEnhancements';
import { formatNumber } from '../../../utils/format/formatters';

interface TopExercisesAreaViewProps {
  topExercisesOverTimeData: any[];
  topExerciseNames: string[];
  pieColors: string[];
  tooltipStyle: Record<string, unknown>;
}

export const TopExercisesAreaView: React.FC<TopExercisesAreaViewProps> = ({
  topExercisesOverTimeData,
  topExerciseNames,
  pieColors,
  tooltipStyle,
}) => {
  const percentData = useMemo(() => {
    if (!Array.isArray(topExercisesOverTimeData) || topExerciseNames.length === 0) return [];
    return topExercisesOverTimeData.map((d: any) => {
      const t = topExerciseNames.reduce((sum: number, k: string) => sum + Number(d[k] ?? 0), 0);
      if (t === 0) {
        const next: any = { ...d, total: 0 };
        topExerciseNames.forEach((k) => { next[k] = 0; });
        return next;
      }
      const next: any = { ...d, total: 100 };
      topExerciseNames.forEach((k) => { next[k] = (Number(d[k] ?? 0) / t) * 100; });
      return next;
    });
  }, [topExercisesOverTimeData, topExerciseNames]);

  if (topExercisesOverTimeData.length === 0 || topExerciseNames.length === 0) {
    return (
      <div className="flex items-center justify-center h-[320px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
        Not enough data to render Most Frequent Exercises area view.
      </div>
    );
  }

  return (
    <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 320 }} />}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={percentData} margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
          <defs>
            <linearGradient id="efGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="6%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="94%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <mask id="efMask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
              <rect x="0" y="0" width="1" height="1" fill="url(#efGrad)" />
            </mask>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.35} vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            padding={RECHARTS_XAXIS_PADDING as any}
            interval={getRechartsXAxisInterval(topExercisesOverTimeData.length)}
          />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => formatAxisNumber(Number(val), '%')} />
          <Tooltip
            contentStyle={tooltipStyle as any}
            formatter={(val: any, name: any) => [`${formatNumber(Number(val), { maxDecimals: 1 })}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: '11px', left: '52%', transform: 'translateX(-50%)', position: 'absolute' }} />
          {topExerciseNames.map((exerciseName, idx) => (
              <Area
              key={exerciseName}
              type="monotone"
              dataKey={exerciseName}
              name={exerciseName}
              stackId="1"
              stroke={pieColors[idx % pieColors.length]}
              fill={pieColors[idx % pieColors.length]}
              fillOpacity={0.25}
              mask="url(#efMask)"
              animationDuration={250}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </LazyRender>
  );
};
