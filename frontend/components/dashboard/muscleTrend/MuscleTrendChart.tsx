import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { normalizeMuscleGroup } from '../../../utils/muscle/analytics';
import { MUSCLE_COLORS, INDIVIDUAL_MUSCLE_COLORS } from '../../../utils/domain/categories';
import { LazyRender } from '../../ui/LazyRender';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import { getRechartsXAxisInterval, RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, calculateYAxisDomain, formatAxisNumber } from '../../../utils/chart/chartEnhancements';
import { formatNumber } from '../../../utils/format/formatters';

type MuscleGrouping = 'groups' | 'muscles';
type MusclePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
type MuscleTrendView = 'area' | 'stackedBar';

interface MuscleTrendChartProps {
  trendData: any[];
  trendKeys: string[];
  muscleGrouping: MuscleGrouping;
  musclePeriod: MusclePeriod;
  muscleTrendView: MuscleTrendView;
  tooltipStyle: Record<string, unknown>;
}

const getTrendColor = (key: string, muscleGrouping: MuscleGrouping) => {
  if (muscleGrouping === 'groups') {
    return (MUSCLE_COLORS as any)[key] || '#94a3b8';
  }
  const muscleKey = key.toLowerCase();
  return INDIVIDUAL_MUSCLE_COLORS[muscleKey] || (MUSCLE_COLORS as any)[normalizeMuscleGroup(key)] || '#94a3b8';
};

export const MuscleTrendChart: React.FC<MuscleTrendChartProps> = ({
  trendData,
  trendKeys,
  muscleGrouping,
  musclePeriod,
  muscleTrendView,
  tooltipStyle,
}) => {
  const yAxisDomain = useMemo(() => {
    return calculateYAxisDomain(trendData, trendKeys);
  }, [trendData, trendKeys]);

  const percentData = useMemo(() => {
    if (!Array.isArray(trendData) || trendKeys.length === 0) return [];
    return trendData.map((d: any) => {
      const t = trendKeys.reduce((sum: number, k: string) => sum + Number(d[k] ?? 0), 0);
      if (t === 0) {
        const next: any = { ...d, total: 0 };
        trendKeys.forEach((k) => { next[k] = 0; });
        return next;
      }
      const next: any = { ...d, total: 100 };
      trendKeys.forEach((k) => { next[k] = (Number(d[k] ?? 0) / t) * 100; });
      return next;
    });
  }, [trendData, trendKeys]);

  const xAxisInterval = useMemo(() => {
    return getRechartsXAxisInterval(trendData.length);
  }, [trendData.length]);

  const tooltipFormatter = (val: any, name: any) =>
    muscleTrendView === 'area'
      ? [`${formatNumber(Number(val), { maxDecimals: 1 })}%`, name]
      : [`${formatNumber(Number(val), { maxDecimals: 1 })} sets`, name];

  if (trendData.length === 0 || trendKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
        Not enough data to render Muscle Analysis trend.
      </div>
    );
  }

  return (
    <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 280 }} />}>
      <ResponsiveContainer width="100%" height={280}>
        {muscleTrendView === 'area' ? (
            <AreaChart key={`area-${musclePeriod}-${muscleGrouping}`} data={percentData} margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
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
                dataKey="dateFormatted"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                padding={RECHARTS_XAXIS_PADDING as any}
                interval={xAxisInterval}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => formatAxisNumber(Number(val), '%')} />
              <Tooltip contentStyle={tooltipStyle as any} formatter={tooltipFormatter as any} />
              <Legend wrapperStyle={{ fontSize: '11px', left: '52%', transform: 'translateX(-50%)', position: 'absolute' }} />
              {trendKeys.map((k) => {
                const color = getTrendColor(k, muscleGrouping);
                return (
                  <Area
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={k}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.25}
                    mask="url(#efMask)"
                    animationDuration={500}
                  />
                );
              })}
            </AreaChart>
          ) : (
            <BarChart key={`bar-${musclePeriod}-${muscleGrouping}`} data={trendData} margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="dateFormatted"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                padding={RECHARTS_XAXIS_PADDING as any}
                interval={xAxisInterval}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={yAxisDomain} tickFormatter={(val) => formatAxisNumber(Number(val))} />
              <Tooltip contentStyle={tooltipStyle as any} cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }} formatter={tooltipFormatter as any} />
              <Legend wrapperStyle={{ fontSize: '11px', left: '52%', transform: 'translateX(-50%)', position: 'absolute' }} />
              {trendKeys.map((k, idx) => {
                const color = getTrendColor(k, muscleGrouping);
                return (
                  <Bar
                    key={k}
                    dataKey={k}
                    name={k}
                    stackId="1"
                    fill={color}
                    radius={idx === trendKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                    animationDuration={500}
                  />
                );
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
    </LazyRender>
  );
};
