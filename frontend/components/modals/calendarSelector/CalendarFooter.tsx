import React from 'react';

interface CalendarFooterProps {
  hasSelection: boolean;
  onApply: () => void;
  onClose?: () => void;
}

export const CalendarFooter: React.FC<CalendarFooterProps> = ({
  hasSelection,
  onApply,
  onClose,
}) => (
  <>
    <div className="mt-3 flex gap-2">
      <button
        onClick={onApply}
        disabled={!hasSelection}
        className={`flex-1 text-xs px-3 py-2 rounded-lg font-semibold transition-colors ${
          hasSelection ? 'bg-emerald-500/520 hover:bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/100' : 'bg-slate-900/40 border border-slate-700/40 text-slate-600 cursor-not-allowed'
        }`}
      >
        Apply
      </button>
    </div>

    <button
      onClick={() => onClose?.()}
      className="sm:hidden mt-2 w-full text-xs px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-950 border border-red-500/40 text-red-200 font-semibold transition-colors"
    >
      Close
    </button>
  </>
);
