import React, { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StrengthBalancePairResult } from '../../../utils/analysis/strengthBalance/strengthBalance';
import { pickTopFindings } from '../../../utils/analysis/strengthBalance/strengthBalance';
import {
  buildStrengthBalanceAnomalySegments,
  buildStrengthBalanceCompactSegments,
  buildTrendChip,
  getFindingLabel,
  getFraming,
  getLaggardPctSeries,
  getRatioTrend,
  type StrengthBalanceSegment,
} from '../../../utils/analysis/strengthBalance/strengthBalanceCopy';
import { getStrengthMovement } from '../../../utils/analysis/strengthBalance/ratioRegistry';
import { RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, formatAxisNumber, getRechartsCategoricalTicks } from '../../../utils/chart/chartEnhancements';
import { CHART_TOOLTIP_STYLE } from '../../../utils/ui/uiConstants';
import { SegmentControl } from '../../ui/SegmentControl';
import { ChartDescription, InsightText } from '../insights/ChartBits';
import { SEMI_FANCY_FONT } from '../../../utils/ui/uiConstants';

const TREND_COLORS = { closing: '#34d399', widening: '#f87171', steady: '#94a3b8' } as const;

const roundTo5 = (v: number): number => Math.round(v / 5) * 5;

const weekLabel = (weekStart: number): string =>
  new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** 3-point centered moving average; edges keep their value. */
const smoothSeries = (values: number[]): number[] => {
  if (values.length < 3) return values;
  return values.map((v, i) => {
    const prev = values[i - 1] ?? v;
    const next = values[i + 1] ?? v;
    return (prev + v + next) / 3;
  });
};

const SegmentsText: React.FC<{
  segments: StrengthBalanceSegment[];
  onExerciseClick?: (exerciseName: string) => void;
}> = ({ segments, onExerciseClick }) => (
  <>
    {segments.map((seg, i) =>
      seg.type === 'exercise' ? (
        <span
          key={i}
          className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (seg.exerciseName) onExerciseClick?.(seg.exerciseName);
          }}
        >
          {seg.text}
        </span>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    )}
  </>
);

/**
 * Recharts line chart for one finding, drawn entirely in the sentence's
 * units: "your X is at 60% of your Y, most lifters sit around 100–135%".
 * The green ReferenceArea is the typical band, the monotone line is the
 * weekly laggard %, and a "now" data point carries the current-value dot so
 * the line and dot always share the exact same rendered position.
 *
 * The y-scale is driven by the data itself (band + current + 90th percentile
 * of the weekly series), so one extreme week can't squash the band into a
 * sliver — the axis simply covers what the data needs.
 */
const LaggardPctChart: React.FC<{ result: StrengthBalancePairResult; trendColor: string }> = ({
  result,
  trendColor,
}) => {
  const f = getFraming(result);
  const series = getLaggardPctSeries(result);
  const { history } = result;
  const strongerLabel = getStrengthMovement(f.strongerId)?.label ?? f.strongerId;

  // Stable y-axis driven by the band and current value only (never by the
  // weekly series): a rare flip week at 300%+ clips at the top edge instead
  // of stretching the whole chart into a sliver.
  const chartMax = Math.ceil((Math.max(f.typicalMax, 100, f.laggardPctRaw) * 1.1) / 25) * 25;

  // Weekly points (smoothed with a 3-week average so heavy/light weeks don't
  // zigzag the line), plus the current level as a final "now" point so the
  // line ends exactly where the current-value dot renders.
  const chartData = useMemo(() => {
    const smoothed = smoothSeries(series);
    const rows = history.map((h, i) => ({
      label: weekLabel(h.weekStart),
      pct: Number(smoothed[i].toFixed(1)),
    }));
    rows.push({ label: 'now', pct: Number(f.laggardPctRaw.toFixed(1)) });
    return rows;
  }, [history, series, f.laggardPctRaw]);

  // App-standard x-axis downsampling: caps tick count, always keeps the
  // first and last labels ("now"), and returns undefined when the data is
  // small enough to show every label.
  const xTicks = getRechartsCategoricalTicks(chartData, (row) => row.label, {
    maxTicks: 5,
    maxTicksMobile: 4,
  });

  const renderCurrentDot = (props: any) => {
    const { cx, cy, index, payload } = props;
    if (index !== chartData.length - 1 || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill={trendColor} stroke="#0f172a" strokeWidth={1.5} />
        <text x={cx - 8} y={cy - 7} fontSize={10} fontWeight="bold" fill="var(--text-primary)" textAnchor="end">
          {roundTo5(Number(payload.pct))}%
        </text>
      </g>
    );
  };

  return (
    <div className="h-44 sm:h-56 lg:h-64 min-w-0 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.35} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            padding={RECHARTS_XAXIS_PADDING as any}
            interval={0}
            ticks={xTicks as any}
          />
          <YAxis
            width={44}
            domain={[0, chartMax]}
            allowDecimals={false}
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatAxisNumber(Number(v))}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE as any}
            labelStyle={{ color: 'var(--text-primary)' }}
            formatter={(value: any) => [`${Math.round(Number(value))}%`, `of ${strongerLabel}`]}
          />
          <ReferenceArea
            y1={f.typicalMin}
            y2={f.typicalMax}
            fill="#34d399"
            fillOpacity={0.15}
            stroke="#34d399"
            strokeOpacity={0.35}
            label={{ value: f.typicalRange, position: 'center', fill: '#34d399', fontSize: 10, fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="pct"
            name="pct"
            stroke={trendColor}
            strokeWidth={1.75}
            fill="none"
            dot={renderCurrentDot}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={true}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const FindingRow: React.FC<{
  result: StrengthBalancePairResult;
  onExerciseClick?: (exerciseName: string) => void;
}> = ({ result, onExerciseClick }) => {
  const segments = result.severity === 'flag'
    ? buildStrengthBalanceAnomalySegments(result)
    : buildStrengthBalanceCompactSegments(result);

  const trend = getRatioTrend(result);
  const trendColor = TREND_COLORS[trend];
  const trendChip = buildTrendChip(result);

  return (
    <div className="space-y-2 flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 text-xs sm:text-[13px] leading-relaxed text-slate-200">
        {segments ? <SegmentsText segments={segments} onExerciseClick={onExerciseClick} /> : null}
      </div>

      {trendChip ? (
        <div className="flex-shrink-0 text-[11px] sm:text-xs font-semibold" style={{ color: trendColor }}>
          {trendChip}
        </div>
      ) : null}

      <LaggardPctChart key={result.pair.id} result={result} trendColor={trendColor} />
    </div>
  );
};

export const StrengthBalanceCard: React.FC<{
  results: StrengthBalancePairResult[];
  tldr: string | null;
  onExerciseClick?: (exerciseName: string) => void;
}> = ({ results, tldr, onExerciseClick }) => {
  const findings = useMemo(() => pickTopFindings(results), [results]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = findings.length > 0 ? Math.min(activeIndex, findings.length - 1) : 0;
  const finding = findings.length > 0 ? findings[active] : null;

  return (
    <div
      className="bg-black/20 rounded-xl border border-slate-700/50 px-2 sm:px-3 py-4 sm:py-6 min-h-[400px] sm:min-h-[480px] lg:min-h-0 lg:h-full flex flex-col"
      style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}
    >
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <Scale className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-xs sm:text-lg font-semibold text-white">Strength Imbalance</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Compared by estimated 1-rep max · population statistics</p>
            </div>
          </div>
          {findings.length === 1 ? (
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold">
              1 finding
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-3">
        {finding ? (
          <div className="flex flex-col h-full space-y-2 pr-1">
            {findings.length > 1 ? (
              <div className="flex-shrink-0 flex items-center justify-center">
                <SegmentControl
                  options={findings.map((f) => ({ value: f.pair.id, label: getFindingLabel(f), title: getFindingLabel(f) }))}
                  value={finding.pair.id}
                  onChange={(value) => {
                    const idx = findings.findIndex((f) => f.pair.id === value);
                    if (idx >= 0) setActiveIndex(idx);
                  }}
                />
              </div>
            ) : null}

            <FindingRow result={finding} onExerciseClick={onExerciseClick} />

            <p className="text-[10px] sm:text-xs text-slate-500 px-1 pt-1">
              A gap can be a real imbalance, different training history, or form/technique differences. Use this as a hint, not a verdict.
            </p>
          </div>
        ) : (
          <div className="text-[10px] sm:text-xs text-slate-500 py-4 text-center">
            No imbalances outside typical ranges right now.
          </div>
        )}
      </div>

      {tldr ? (
        <div className="flex-shrink-0 mt-1 pt-2 border-t border-red-500/20">
          <span className="text-[10px] sm:text-xs font-bold text-red-400" style={SEMI_FANCY_FONT}>
            TL;DR {tldr}
          </span>
        </div>
      ) : null}

      <ChartDescription>
        <InsightText text="Strength imbalance compares your estimated 1-rep max across related exercises (bench vs press, push vs pull, legs vs back) against population statistics from roughly 28 million logged lifts. Ratios far outside the typical band are hints worth investigating, never verdicts — your next session plan can close the gap over a few weeks." />
      </ChartDescription>
    </div>
  );
};
