import React from 'react';
import { BodyMap, BodyMapGender } from '../../bodyMap/BodyMap';
import { Grid3X3, Infinity, Scan } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Tooltip as HoverTooltip, type TooltipData } from '../../ui/Tooltip';
import { CHART_TOOLTIP_STYLE, RADAR_TICK_FILL } from '../../../utils/ui/uiConstants';
import { getVolumeZoneColor } from '../../../utils/muscle/hypertrophy/muscleParams';
import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import type { MuscleVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';

interface MuscleAnalysisBodyMapPanelProps {
  bodyMapGender: BodyMapGender;
  weeklySetsChartView: 'heatmap' | 'radar';
  setWeeklySetsChartView: (value: 'heatmap' | 'radar') => void;
  weeklySetsWindow: WeeklySetsWindow;
  setWeeklySetsWindow: (value: WeeklySetsWindow) => void;
  selectedSvgIdForUrlRef: React.MutableRefObject<string | null>;
  updateSelectionUrl: (payload: { svgId: string; mode: 'headless'; window: WeeklySetsWindow }) => void;
  muscleVolumes: Map<string, number>;
  maxVolume: number;
  volumeThresholds: MuscleVolumeThresholds;
  selectedMuscle: string | null;
  selectedBodyMapIds?: string[];
  hoveredBodyMapIds?: string[];
  handleMuscleClick: (muscleId: string) => void;
  handleMuscleHover: (muscleId: string | null, e?: MouseEvent) => void;
  radarData: Array<{ subject: string; value: number }>;
  hoverTooltip: TooltipData | null;
}

export const MuscleAnalysisBodyMapPanel: React.FC<MuscleAnalysisBodyMapPanelProps> = ({
  bodyMapGender,
  weeklySetsChartView,
  setWeeklySetsChartView,
  weeklySetsWindow,
  setWeeklySetsWindow,
  selectedSvgIdForUrlRef,
  updateSelectionUrl,
  muscleVolumes,
  maxVolume,
  volumeThresholds,
  selectedMuscle,
  selectedBodyMapIds,
  hoveredBodyMapIds,
  handleMuscleClick,
  handleMuscleHover,
  radarData,
  hoverTooltip,
}) => {
  const handleClick = (muscleId: string) => {
    handleMuscleClick(muscleId);
    // Scroll to graph on mobile/tablet (< 1024px)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const target = document.getElementById('all-muscles-graph');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  return (
    <div className="bg-black/70 rounded-xl border border-slate-700/50 p-4 relative flex flex-col h-full overflow-hidden">
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-end gap-2">
        <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-700/50 shrink-0">
          <button
            onClick={() => setWeeklySetsChartView('heatmap')}
            title="Heatmap"
            aria-label="Heatmap"
            className={`w-6 h-5 flex items-center justify-center rounded ${weeklySetsChartView === 'heatmap' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
          >
            <Grid3X3 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setWeeklySetsChartView('radar')}
            title="Radar"
            aria-label="Radar"
            className={`w-6 h-5 flex items-center justify-center rounded ${weeklySetsChartView === 'radar' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
          >
            <Scan className="w-3 h-3" />
          </button>
        </div>

        <div className="inline-flex bg-black/70 rounded-lg p-0.5 border border-slate-700/50">
          {(['all', '7d', '30d', '365d'] as const).map((w) => (
            <button
              key={w}
              onClick={() => {
                setWeeklySetsWindow(w);
                const svgId = selectedSvgIdForUrlRef.current;
                if (!svgId) return;
                updateSelectionUrl({ svgId, window: w });
              }}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${weeklySetsWindow === w
                ? 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-white'
                }`}
              title={w === 'all' ? 'All time' : w === '7d' ? 'Last week' : w === '30d' ? 'Last month' : 'Last year'}
            >
              {w === 'all' ? <Infinity className="w-2.5 h-2.5" /> : w === '7d' ? 'lst wk' : w === '30d' ? 'lst mo' : 'lst yr'}
            </button>
          ))}
        </div>
      </div>

      {weeklySetsChartView === 'radar' ? (
        <div className="flex-1 flex flex-col items-center justify-center h-full pt-10">
          {radarData.some((d) => (d.value ?? 0) > 0) ? (
            <div className="w-full min-h-[280px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={({ payload, x, y, index, cx, cy }: { payload?: { subject?: string }; x?: number; y?: number; index?: number; cx?: number; cy?: number }) => {
                      const label = radarData[index ?? 0]?.subject ?? payload?.subject ?? '';
                      const px = x ?? 0;
                      const py = y ?? 0;
                      const outward = 1.18;
                      const tx = cx != null && cy != null ? cx + (px - cx) * outward : px;
                      const ty = cx != null && cy != null ? cy + (py - cy) * outward : py;
                      return (
                        <g transform={`translate(${tx},${ty})`}>
                          <text fill={RADAR_TICK_FILL} fontSize={11} textAnchor="middle" dominantBaseline="middle">
                            {label}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar
                    name="Weekly Sets"
                    dataKey="value"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fill="#06b6d4"
                    fillOpacity={0.35}
                    animationDuration={1500}
                  />
                  <RechartsTooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number) => [`${Number(value).toFixed(1)} sets/wk`]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[280px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg mx-2 w-full">
              No muscle composition for this period yet.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full pt-10">
          <div className="flex-1 h-full flex items-center justify-center pb-8 scale-[0.9]">
            <BodyMap
              onPartClick={handleClick}
              selectedPart={selectedMuscle}
              selectedMuscleIdsOverride={selectedBodyMapIds}
              hoveredMuscleIdsOverride={hoveredBodyMapIds}
              muscleVolumes={muscleVolumes}
              maxVolume={maxVolume}
              volumeThresholds={volumeThresholds}
              onPartHover={handleMuscleHover}
              gender={bodyMapGender}
              viewMode="headless"
            />
          </div>

          <div className="sm:hidden mb-6 text-center text-[11px] font-semibold text-slate-600">
            Tap to see more details
          </div>
          <div className="mt-auto flex flex-col items-center justify-center gap-2 pb-1 w-full">
            <div className="hidden sm:block text-center text-[11px] text-slate-500">
              Hover over muscles to preview, click to view exercises
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-950/75 rounded-lg px-3 py-1.5 max-w-full">
              {(() => {
                const thresholds = volumeThresholds;
                return (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 rounded" style={{ backgroundColor: '#ffffff' }}></div>
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
          </div>
          
        </div>
      )}

      {hoverTooltip && <HoverTooltip data={hoverTooltip} />}
    </div>
  );
};
