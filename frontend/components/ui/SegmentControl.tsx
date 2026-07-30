import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
  title?: string;
}

interface SegmentControlProps<T extends string = string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const ACTIVE_CLASS = 'bg-blue-500/20 text-blue-400';

const INACTIVE_CLASS = 'text-slate-500 hover:text-slate-200';

export function SegmentControl<T extends string = string>({
  options,
  value,
  onChange,
}: SegmentControlProps<T>): React.ReactElement {
  return (
    <div
      className="p-0.5 rounded-xl inline-flex gap-0.5 shrink-0"
      style={{ backgroundColor: 'rgba(128, 128, 128, 0.08)' }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          title={option.title}
          aria-label={option.title}
          className={`h-7 flex items-center justify-center gap-1 rounded-2xl cursor-pointer transition-all duration-200 ${
            value === option.value ? ACTIVE_CLASS : INACTIVE_CLASS
          } ${
            option.icon ? 'pl-2 pr-1.5 pt-0.5' : 'px-1.5 text-[11px] font-bold leading-none whitespace-nowrap'
          }`}
        >
          {option.icon && <span className="w-3.5 h-3.5 flex-shrink-0">{option.icon}</span>}
          {option.label && <span className="text-[11px] font-bold leading-none whitespace-nowrap">{option.label}</span>}
        </button>
      ))}
    </div>
  );
}

export default SegmentControl;