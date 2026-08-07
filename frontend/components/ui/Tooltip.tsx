import React from 'react';
import { AnalysisStatus } from '../../types';
import { TOOLTIP_THEMES, TOOLTIP_CONFIG, calculateCenteredTooltipPosition, calculateMouseTooltipPosition } from '../../utils/ui/uiConstants';

export interface TooltipData {
  rect?: DOMRect;
  mouseX?: number;
  mouseY?: number;
  title: string;
  titleColor?: string;
  body?: string;
  bodySections?: Array<{ text: string; color?: string }>;
  footer?: string;
  status: AnalysisStatus | 'default';
  metrics?: Array<{ label: string; value: string }>;
}

interface TooltipProps {
  data: TooltipData;
}

export const Tooltip: React.FC<TooltipProps> = ({ data }) => {
  const { rect, mouseX, mouseY, title, titleColor, body, bodySections, footer, status, metrics } = data;
  const theme = TOOLTIP_THEMES[status];
  
  let positionStyle;
  if (mouseX !== undefined && mouseY !== undefined) {
    positionStyle = calculateMouseTooltipPosition(mouseX, mouseY, TOOLTIP_CONFIG.WIDTH);
  } else if (rect) {
    positionStyle = calculateCenteredTooltipPosition(rect, TOOLTIP_CONFIG.WIDTH);
  } else {
    positionStyle = {};
  }

  return (
    <div
      className="fixed z-[9999] pointer-events-none transition-[opacity,transform] duration-100 zoom-in-95"
      style={{
        ...positionStyle,
        transformOrigin: rect ? (rect.top < TOOLTIP_CONFIG.FLIP_THRESHOLD ? 'top center' : 'bottom center') : 'bottom center',
      }}
    >
      <div
        className={`border rounded-xl p-3 ${theme} inline-block w-fit`}
        style={{ maxWidth: TOOLTIP_CONFIG.WIDTH, backgroundColor: 'rgb(var(--mw-tooltip-rgb) / var(--mw-tooltip-alpha))' }}
      >
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/10">
          <span className="font-bold uppercase text-[11px] sm:text-xs tracking-wider" style={titleColor ? { color: titleColor } : undefined}>{title}</span>
        </div>
        {bodySections ? (
          <div className="text-xs leading-relaxed whitespace-pre-line break-words space-y-1">
            {bodySections.map((s, i) => (
              <div
                key={i}
                dangerouslySetInnerHTML={{ __html: s.text }}
              />
            ))}
          </div>
        ) : body ? (
          <div className="text-xs leading-relaxed opacity-90 whitespace-pre-line break-words">{body}</div>
        ) : null}
        {metrics && metrics.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10 flex gap-4 text-xs font-mono opacity-80">
            {metrics.map((m, i) => (
              <div key={i}>
                <span>{m.label}:</span>
                <span className="font-bold ml-1">{m.value}</span>
              </div>
            ))}
          </div>
        )}
        {footer && (
          <div className="mt-2 text-[11px] sm:text-xs font-bold text-blue-400 break-words">{footer}</div>
        )}
      </div>
    </div>
  );
};

export const useTooltip = () => {
  const [tooltip, setTooltip] = React.useState<TooltipData | null>(null);

  const showTooltip = React.useCallback(
    (e: React.MouseEvent, data: Omit<TooltipData, 'rect' | 'mouseX' | 'mouseY'>) => {
      setTooltip({ ...data, mouseX: e.clientX, mouseY: e.clientY });
    },
    []
  );

  const hideTooltip = React.useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip, showTooltip, hideTooltip };
};
