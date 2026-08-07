import React from 'react';
import { Check, Info } from 'lucide-react';

import type { TooltipData } from '../../ui/Tooltip';
import type { AnalysisModule, AnalysisModuleId } from './aiAnalyzeConfig';

interface AiAnalyzeModuleGridProps {
  visibleModules: AnalysisModule[];
  selectedIds: AnalysisModuleId[];
  onToggleModule: (id: AnalysisModuleId) => void;
  showTooltip: (e: React.MouseEvent, data: Omit<TooltipData, 'rect'>) => void;
  hideTooltip: () => void;
}

export const AiAnalyzeModuleGrid: React.FC<AiAnalyzeModuleGridProps> = ({
  visibleModules,
  selectedIds,
  onToggleModule,
  showTooltip,
  hideTooltip,
}) => (
  <div
    style={{ height: '256px' }}
  >
    <div className="overflow-y-auto h-full pt-6 px-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleModules.map((m) => {
          const selected = selectedIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggleModule(m.id)}
              className={`text-left p-3 rounded-xl border transition-colors ${
                selected
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-black/20 border-slate-700/50 hover:border-slate-600 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center flex-shrink-0">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        selected
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'border border-slate-600 bg-transparent text-transparent'
                      }`}
                      aria-hidden
                    >
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-semibold truncate ${
                        selected
                          ? 'text-emerald-300'
                          : 'text-slate-200'
                      }`}
                    >
                      {m.label}
                    </div>
                  </div>
                </div>
                <Info
                  className="w-5 h-5 text-slate-600 hover:text-slate-300 flex-shrink-0 cursor-help"
                  onMouseEnter={(e) =>
                    showTooltip(e, {
                      title: m.label,
                      body: m.tooltip,
                      status: 'default',
                    })
                  }
                  onMouseLeave={hideTooltip}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
