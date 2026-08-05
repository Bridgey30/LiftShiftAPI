import React from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SelectProps<T extends string = string> {
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function Select<T extends string = string>({
  options,
  value,
  onChange,
  label,
  icon,
  subtitle,
  className,
}: SelectProps<T>): React.ReactElement {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-slate-300">{label}</span>
      </div>
      {subtitle && (
        <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">{subtitle}</p>
      )}
      <div className="relative rounded-md border border-slate-700/50 bg-slate-900/20 hover:ring-1 hover:ring-emerald-500 hover:bg-slate-900/40 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full bg-transparent border-0 px-3 py-2 pr-9 text-xs text-slate-200 appearance-none cursor-pointer focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
              {opt.label}{opt.description ? ` — ${opt.description}` : ''}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

export default Select;
