import React, { useMemo, useState, useCallback } from 'react';
import { formatDeltaPercentage } from '../../../utils/format/deltaFormat';
import { type BodyMapGender } from '../../bodyMap/BodyMap';
import { ChartDescription, InsightLine, InsightText, TrendBadge, BadgeLabel } from '../insights/ChartBits';
import { toHeadlessVolumeMap, HEADLESS_MUSCLE_NAMES } from '../../../utils/muscle/mapping';
import { getHeadlessRadarSeries } from '../../../utils/muscle/mapping';
import { differenceInCalendarDays } from 'date-fns';
import { isPlausibleDate } from '../../../utils/date/dateUtils';
import { WeeklySetsHeader } from './WeeklySetsHeader';
import { WeeklySetsRadarView } from './WeeklySetsRadarView';
import { WeeklySetsHeatmapView } from './WeeklySetsHeatmapView';
import { Tooltip, type TooltipData } from '../../ui/Tooltip';
import { weeklyStimulusFromThresholds } from '../../../utils/muscle/hypertrophy/hypertrophyCalculations';
import { getVolumeThresholds, getVolumeZoneColor, getVolumeZone, type TrainingLevel } from '../../../utils/muscle/hypertrophy/muscleParams';

type WeeklySetsView = 'radar' | 'heatmap';
type WeeklySetsWindow = 'all' | '7d' | '30d' | '365d';

type HeatmapData = {
  volumes: Map<string, number>;
  maxVolume: number;
};

const formatWindowDuration = (days: number): string => {
  if (days <= 7) return `${days} wk`;
  if (days <= 30) return `${Math.round(days / 7)} wk`;
  if (days <= 365) return `${Math.round(days / 30)} mo`;
  return `${Math.round(days / 365)} yr`;
};

const safePct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

export const WeeklySetsCard = ({
  isMounted,
  weeklySetsView,
  setWeeklySetsView,
  muscleCompQuick,
  setMuscleCompQuick,
  heatmap,
  tooltipStyle,
  onMuscleClick,
  bodyMapGender,
  windowStart,
  now,
  trainingLevel,
}: {
  isMounted: boolean;
  weeklySetsView: WeeklySetsView;
  setWeeklySetsView: (v: WeeklySetsView) => void;
  muscleCompQuick: WeeklySetsWindow;
  setMuscleCompQuick: (v: WeeklySetsWindow) => void;
  heatmap: HeatmapData;
  tooltipStyle: Record<string, unknown>;
  onMuscleClick?: (muscleId: string, weeklySetsWindow: 'all' | '7d' | '30d' | '365d') => void;
  bodyMapGender?: BodyMapGender;
  windowStart?: Date | null;
  now: Date;
  trainingLevel: TrainingLevel;
}) => {
  const [heatmapHoveredMuscle, setHeatmapHoveredMuscle] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<TooltipData | null>(null);

  const headlessVolumes = useMemo(() => toHeadlessVolumeMap(heatmap.volumes), [heatmap.volumes]);
  const radarData = useMemo(() => getHeadlessRadarSeries(headlessVolumes), [headlessVolumes]);
  const volumeThresholds = useMemo(() => getVolumeThresholds(trainingLevel), [trainingLevel]);

  const handleMuscleHover = useCallback((muscleId: string | null, e?: MouseEvent) => {
    if (!muscleId || !e) {
      setHoverTooltip(null);
      setHeatmapHoveredMuscle(null);
      return;
    }

    const target = e.target as Element | null;
    const groupEl = target?.closest?.('g[id]') as Element | null;
    const rect = groupEl?.getBoundingClientRect?.() as DOMRect | undefined;
    if (!rect) {
      setHoverTooltip(null);
      return;
    }

    setHeatmapHoveredMuscle(muscleId);

    const rate = headlessVolumes.get(muscleId) || 0;
    const stimulus = weeklyStimulusFromThresholds(rate, volumeThresholds);
    const zone = getVolumeZone(rate, volumeThresholds);
    const bodyText = `${rate.toFixed(1)} sets/wk — ${zone.label}\n${stimulus}% of wkly possible gains\n${zone.explanation}`;

    setHoverTooltip({
      rect,
      title: (HEADLESS_MUSCLE_NAMES as any)[muscleId] ?? muscleId,
      body: bodyText,
      status: rate > 0 ? 'success' : 'default',
    });
  }, [headlessVolumes, volumeThresholds]);

  const weeklySetsInsight = useMemo(() => {
    const hasData = radarData.some((d) => (d.value ?? 0) > 0);
    if (!hasData) return null;
    const total = radarData.reduce((acc, d) => acc + (d.value || 0), 0);
    const sorted = [...radarData].filter((d) => (d.value ?? 0) > 0).sort((a, b) => (b.value || 0) - (a.value || 0));
    const top = sorted[0];
    if (!top) return null;
    const top3 = sorted.slice(0, 3).reduce((acc, d) => acc + (d.value || 0), 0);
    const top3Share = total > 0 ? safePct(top3, total) : 0;

    let durationLabel = '';
    if (windowStart && isPlausibleDate(windowStart) && isPlausibleDate(now)) {
      const days = differenceInCalendarDays(now, windowStart) + 1;
      durationLabel = ` (${formatWindowDuration(days)})`;
    }

    return { total, top, top3Share, durationLabel };
  }, [radarData, windowStart, now]);

  const heatmapHoveredMuscleIds = heatmapHoveredMuscle ? [heatmapHoveredMuscle] : undefined;

  const handleBodyMapClick = (muscleId: string) => {
    if (!onMuscleClick) return;
    const isDesktop = typeof window === 'undefined' ? true : (window.matchMedia?.('(min-width: 640px)')?.matches ?? true);
    if (!isDesktop) return;
    onMuscleClick(muscleId, muscleCompQuick);
  };

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 min-w-0">
      <WeeklySetsHeader
        weeklySetsView={weeklySetsView}
        setWeeklySetsView={setWeeklySetsView}
        muscleCompQuick={muscleCompQuick}
        setMuscleCompQuick={setMuscleCompQuick}
      />

      <div
        className={`relative z-10 flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } min-w-0 pb-10`}
      >
        {weeklySetsView === 'radar' ? (
          <WeeklySetsRadarView radarData={radarData} tooltipStyle={tooltipStyle} />
        ) : (
          <WeeklySetsHeatmapView
            heatmap={heatmap}
            headlessVolumes={headlessVolumes}
            heatmapHoveredMuscleIds={heatmapHoveredMuscleIds}
            onBodyMapClick={handleBodyMapClick}
            bodyMapGender={bodyMapGender}
            onMuscleHover={handleMuscleHover}
            volumeThresholds={volumeThresholds}
          />
        )}
      </div>

      {weeklySetsView === 'heatmap' && heatmap.volumes.size > 0 ? (
        <div className="sm:hidden -mt-12 text-center text-[11px] font-semibold text-slate-500">
          Tap on the muscles
        </div>
      ) : null}

      <ChartDescription
        isMounted={isMounted}
        topSlot={
          weeklySetsView === 'heatmap' ? (
            <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-950/75 border border-slate-700/50 backdrop-blur-sm rounded-lg px-3 py-1.5 w-fit">
              {(() => {
                const thresholds = getVolumeThresholds(trainingLevel);
                return (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 rounded border border-slate-700/50" style={{ backgroundColor: '#ffffff' }}></div>
                      <span>None</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 rounded" style={{ backgroundColor: getVolumeZoneColor(thresholds.mv, thresholds) }}></div>
                      <span>Activate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 rounded" style={{ backgroundColor: getVolumeZoneColor(thresholds.mev, thresholds) }}></div>
                      <span>Stimulate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 rounded" style={{ backgroundColor: getVolumeZoneColor(thresholds.maxv, thresholds) }}></div>
                      <span>Overdrive</span>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null
        }
      >
        <InsightLine>
          {weeklySetsInsight ? (
            <>
              <TrendBadge
                label={<BadgeLabel main={`~${Number(weeklySetsInsight.total).toFixed(1)} sets/wk${weeklySetsInsight.durationLabel}`} />}
                tone="info"
              />
              <TrendBadge
                label={`Top: ${weeklySetsInsight.top.subject} ${Number(weeklySetsInsight.top.value).toFixed(1)} sets/wk`}
                tone="neutral"
              />
              <TrendBadge
                label={`Top3 ${formatDeltaPercentage(weeklySetsInsight.top3Share)}`}
                tone={
                  weeklySetsInsight.top3Share >= 70
                    ? 'bad'
                    : weeklySetsInsight.top3Share >= 55
                      ? 'neutral'
                      : 'good'
                }
              />
            </>
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}
        </InsightLine>
        <InsightText text="Read this as your weekly set allocation. If the Top 3 share is high, your volume is concentrated. This is great for specialization, but watch balance." />
      </ChartDescription>

      {hoverTooltip && <Tooltip data={hoverTooltip} />}
    </div>
  );
};
