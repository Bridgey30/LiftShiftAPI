import React from 'react';
import { Moon, Palette, SlidersHorizontal, Sparkles, Sun, Type, Image, Layers } from 'lucide-react';
import { ExerciseTrendMode, FontChoice, ThemeMode } from '../../../utils/storage/localStorage';
import { Select } from '../../ui/Select';
import { CompactThemeOption } from './UserPreferencesThemeOption';

const formatSecondaryInput = (value: number): string => {
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

interface TrendModeSectionProps {
  exerciseTrendMode: ExerciseTrendMode;
  onExerciseTrendModeChange: (mode: ExerciseTrendMode) => void;
}

const TREND_OPTIONS = [
  { value: 'stable' as const, label: 'Stable', description: 'More stable, slower to react' },
  { value: 'reactive' as const, label: 'Reactive', description: 'Responds faster to recent sessions (recommended)' },
] as const;

export const TrendModeSection: React.FC<TrendModeSectionProps> = ({
  exerciseTrendMode,
  onExerciseTrendModeChange,
}) => (
  <Select
    options={TREND_OPTIONS}
    value={exerciseTrendMode}
    onChange={onExerciseTrendModeChange}
    label="Trend Reactiveness"
    subtitle="How quickly trend lines adapt to recent workout data"
    icon={<Sparkles className="w-3.5 h-3.5 text-slate-500" />}
  />
);

interface ThemeSectionProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  showTransparency?: boolean;
  darkBgChoice?: string;
  onDarkBgChoiceChange?: (value: string) => void;
}

const THEME_OPTIONS = [
  { value: 'pure-black' as const, label: 'Pure Black' },
  { value: 'light' as const, label: 'Light' },
  { value: 'medium-dark' as const, label: 'Medium' },
] as const;

export const ThemeSection: React.FC<ThemeSectionProps> = ({
  themeMode,
  onThemeModeChange,
  showTransparency,
  darkBgChoice,
  onDarkBgChoiceChange,
}) => {
  const showDarkBgToggle = showTransparency && themeMode !== 'light';

  return (
    <>
      <div className="md:hidden">
        <Select
          options={THEME_OPTIONS}
          value={themeMode}
          onChange={onThemeModeChange}
          label="Theme"
          subtitle="Choose the app color scheme"
          icon={<Palette className="w-3.5 h-3.5 text-slate-500" />}
        />
        {showDarkBgToggle && (
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => onDarkBgChoiceChange?.('dark-bg1')}
              className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                darkBgChoice === 'dark-bg1'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900/20 border-slate-700/50 text-slate-400 hover:ring-1 hover:ring-emerald-500'
              }`}
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => onDarkBgChoiceChange?.('dark-bg5')}
              className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                darkBgChoice === 'dark-bg5'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900/20 border-slate-700/50 text-slate-400 hover:ring-1 hover:ring-emerald-500'
              }`}
            >
              Red
            </button>
          </div>
        )}
      </div>
      <div className="hidden md:block space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-300">Theme</span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-500">Choose the app color scheme</p>
        <div className="grid grid-cols-3 gap-2">
          <CompactThemeOption
            mode="pure-black"
            currentMode={themeMode}
            onClick={() => onThemeModeChange('pure-black')}
            label="Pure Black"
            icon={<Moon className="w-3.5 h-3.5" />}
          />
          <CompactThemeOption
            mode="light"
            currentMode={themeMode}
            onClick={() => onThemeModeChange('light')}
            label="Light"
            icon={<Sun className="w-3.5 h-3.5" />}
          />
          <CompactThemeOption
            mode="medium-dark"
            currentMode={themeMode}
            onClick={() => onThemeModeChange('medium-dark')}
            label="Medium"
            icon={<Moon className="w-3.5 h-3.5" />}
          />
        </div>

        {showDarkBgToggle && (
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">Dark BG</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onDarkBgChoiceChange?.('dark-bg1')}
                className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                  darkBgChoice === 'dark-bg1'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-900/20 border-slate-700/50 text-slate-400 hover:ring-1 hover:ring-emerald-500'
                }`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => onDarkBgChoiceChange?.('dark-bg5')}
                className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                  darkBgChoice === 'dark-bg5'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-900/20 border-slate-700/50 text-slate-400 hover:ring-1 hover:ring-emerald-500'
                }`}
              >
                Red
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

interface FontSectionProps {
  font: FontChoice;
  onFontChange: (font: FontChoice) => void;
}

const FONT_OPTIONS = [
  { value: 'original' as const, label: 'Classic', description: 'System default' },
  { value: 'loraItalic' as const, label: 'Journal', description: 'Elegant italic serif' },
  { value: 'nunito' as const, label: 'Modern', description: 'Warm rounded sans' },
] as const;

export const FontSection: React.FC<FontSectionProps> = ({ font, onFontChange }) => (
  <Select
    options={FONT_OPTIONS}
    value={font}
    onChange={onFontChange}
    label="Base Font"
    subtitle="Typography style for the app interface"
    icon={<Type className="w-3.5 h-3.5 text-slate-500" />}
  />
);

interface SecondarySetMultiplierSectionProps {
  secondarySetMultiplier: number;
  onSecondarySetMultiplierChange: (value: number) => void;
}

export const SecondarySetMultiplierSection: React.FC<SecondarySetMultiplierSectionProps> = ({
  secondarySetMultiplier,
  onSecondarySetMultiplierChange,
}) => {
  const [draft, setDraft] = React.useState<string>(() => formatSecondaryInput(secondarySetMultiplier));

  React.useEffect(() => {
    setDraft(formatSecondaryInput(secondarySetMultiplier));
  }, [secondarySetMultiplier]);

  const commitDraft = React.useCallback(() => {
    const raw = draft.trim();
    if (!raw) {
      setDraft(formatSecondaryInput(secondarySetMultiplier));
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(formatSecondaryInput(secondarySetMultiplier));
      return;
    }
    const clamped = Math.min(1, Math.max(0, parsed));
    const normalized = Number(clamped.toFixed(2));
    onSecondarySetMultiplierChange(normalized);
    setDraft(formatSecondaryInput(normalized));
  }, [draft, onSecondarySetMultiplierChange, secondarySetMultiplier]);

  return (
    <div className="space-y-2">
    <div className="flex items-center gap-2 text-slate-200">
      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-xs font-medium">Secondary Set Value</span>
    </div>
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/20 p-3 space-y-2">
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '') {
            setDraft('');
            return;
          }
          if (!/^\d*\.?\d*$/.test(next)) return;
          setDraft(next);
        }}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitDraft();
          }
        }}
        className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 hover:ring-1 hover:ring-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
        placeholder="0.00 to 1.00"
        aria-label="Secondary set multiplier"
      />
      <p className="text-[11px] sm:text-xs text-slate-500">For accurate tracking, set to: Beginner 0.4, Intermediate 0.3, Advanced 0.2</p>
    </div>
    </div>
  );
};

interface TransparencySectionProps {
  showTransparency: boolean;
  onShowTransparencyChange: (value: boolean) => void;
}

const TRANSPARENCY_OPTIONS = [
  { value: 'true' as const, label: 'On', description: 'Solid background (no image)' },
  { value: 'false' as const, label: 'Off', description: 'Layered background (with image)' },
] as const;

export const TransparencySection: React.FC<TransparencySectionProps> = ({
  showTransparency,
  onShowTransparencyChange,
}) => (
  <Select
    options={TRANSPARENCY_OPTIONS}
    value={showTransparency ? 'false' : 'true'}
    onChange={(v) => onShowTransparencyChange(v !== 'true')}
    label="Solid BG"
    subtitle="Toggle solid versus layered background"
    icon={<Image className="w-3.5 h-3.5 text-slate-500" />}
  />
);
