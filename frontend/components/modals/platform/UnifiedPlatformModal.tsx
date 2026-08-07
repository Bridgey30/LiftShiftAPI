import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Key, LogIn, MinusCircle, Upload } from 'lucide-react';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import { savePreferencesConfirmed } from '../../../utils/storage/localStorage';
import { UNIFORM_HEADER_BUTTON_CLASS, UNIFORM_HEADER_ICON_BUTTON_CLASS } from '../../../utils/ui/uiConstants';
import { useTheme } from '../../theme/ThemeProvider';
import { OnboardingModalShell } from '../ui/OnboardingModalShell';
import { CSVExportHelp } from '../csvImport/CSVExportHelp';
import { CSVImportBodyTypeSelector } from '../csvImport/CSVImportBodyTypeSelector';
import { CSVImportUnitSelector } from '../csvImport/CSVImportUnitSelector';
import { HevyLoginHelp } from '../auth/HevyLoginHelp';
import { PlatformModalHeader, type PlatformMethod } from './PlatformModalHeader';
import { PlatformModalFooter } from './PlatformModalFooter';
import { CredentialsContent } from './CredentialsContent';
import { ApiKeyContent } from './ApiKeyContent';
import { CsvContent } from './CsvContent';

type Platform = 'hevy' | 'strong' | 'lyfta' | 'other' | 'motra';

const ICON_CLS = 'w-3.5 h-3.5';

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  credentials: <LogIn className={ICON_CLS} />,
  apiKey: <Key className={ICON_CLS} />,
  csv: <Upload className={ICON_CLS} />,
};

const PLATFORM_LABEL: Record<Platform, string> = {
  hevy: 'Hevy',
  strong: 'Strong',
  lyfta: 'Lyfta',
  other: 'Other',
  motra: 'Motra',
};

interface UnifiedPlatformModalProps {
  intent: 'initial' | 'update';
  platform: Platform;

  onHevyLogin?: (emailOrUsername: string, password: string) => void;
  onHevyApiKeyLogin?: (apiKey: string) => void;
  hevyLoginError?: string | null;
  onSetHevyLoginError?: (msg: string | null) => void;

  onLyftaLogin?: (apiKey: string) => void;
  lyftaLoginError?: string | null;
  onSetLyftaLoginError?: (msg: string | null) => void;

  onProcessFile: (
    file: File,
    platform: Platform,
    unitOverride?: WeightUnit,
  ) => void;
  csvImportError?: string | null;
  onSetCsvImportError?: (msg: string | null) => void;

  preferencesConfirmed: boolean;
  bodyMapGender: BodyMapGender;
  weightUnit: WeightUnit;
  onSetBodyMapGender: (g: BodyMapGender) => void;
  onSetWeightUnit: (u: WeightUnit) => void;
  onSetPreferencesConfirmed: (v: boolean) => void;

  hasSavedSession?: boolean;
  onSyncSaved?: () => void;

  isAnalyzing: boolean;
  onClearCache?: () => void;
  onForceRefresh?: () => void;

  onAddDataSource?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export function UnifiedPlatformModal({
  intent,
  platform,
  onHevyLogin,
  onHevyApiKeyLogin,
  hevyLoginError,
  onSetHevyLoginError,
  onLyftaLogin,
  lyftaLoginError,
  onSetLyftaLoginError,
  onProcessFile,
  csvImportError,
  onSetCsvImportError,
  preferencesConfirmed,
  bodyMapGender,
  weightUnit,
  onSetBodyMapGender,
  onSetWeightUnit,
  onSetPreferencesConfirmed,
  hasSavedSession = false,
  onSyncSaved,
  isAnalyzing,
  onClearCache,
  onAddDataSource,
  onBack,
  onClose,
}: UnifiedPlatformModalProps): React.ReactElement {
  const { mode } = useTheme();
  const isLight = mode === 'light';

  const defaultMethod: PlatformMethod =
    platform === 'hevy'
      ? 'credentials'
      : platform === 'lyfta'
        ? 'apiKey'
        : 'csv';

  const [phase, setPhase] = useState<'preferences' | 'content'>(
    preferencesConfirmed ? 'content' : 'preferences',
  );
  const [activeMethod, setActiveMethod] =
    useState<PlatformMethod>(defaultMethod);
  const [showHelp, setShowHelp] = useState(false);
  const [showExportHelp, setShowExportHelp] = useState(false);
  const [localGender, setLocalGender] = useState<BodyMapGender>(
    bodyMapGender || 'male',
  );
  const [localUnit, setLocalUnit] = useState<WeightUnit>(weightUnit || 'kg');

  const makeSegment = (
    value: PlatformMethod,
    label: string,
  ) => ({
    value,
    label,
    icon: SEGMENT_ICONS[value],
  });

  const methodSegments =
    platform === 'hevy'
      ? [
          makeSegment('credentials', 'Login'),
          makeSegment('apiKey', 'API key'),
          makeSegment('csv', 'CSV'),
        ]
      : platform === 'lyfta'
        ? [
            makeSegment('apiKey', 'API key'),
            makeSegment('csv', 'CSV'),
          ]
        : [makeSegment('csv', 'CSV')];

  const subtitles: Record<PlatformMethod, string> = {
    credentials: 'Login with Hevy directly to auto-sync your workouts.',
    apiKey:
      platform === 'hevy'
        ? 'Enter your Hevy Pro API key to sync your workouts.'
        : 'Enter your Lyfta API key to auto-sync your workouts.',
    csv:
      platform === 'motra'
        ? 'Upload your Motra Excel export.'
        : `Upload your ${PLATFORM_LABEL[platform]} CSV export.`,
  };

  const helpLabels: Record<PlatformMethod, string> = {
    credentials: 'How to login',
    apiKey: 'How to get API key',
    csv: 'How to export CSV',
  };

  const activeError: string | null =
    activeMethod === 'credentials'
      ? (hevyLoginError ?? null)
      : activeMethod === 'apiKey'
        ? platform === 'hevy'
          ? (hevyLoginError ?? null)
          : (lyftaLoginError ?? null)
        : (csvImportError ?? null);

  const handleCredentialsLogin = (emailOrUsername: string, password: string) => {
    onSetHevyLoginError?.(null);
    onHevyLogin?.(emailOrUsername, password);
  };

  const handleApiKeyLogin = (apiKey: string) => {
    if (platform === 'hevy') {
      onSetHevyLoginError?.(null);
      onHevyApiKeyLogin?.(apiKey);
    } else {
      onSetLyftaLoginError?.(null);
      onLyftaLogin?.(apiKey);
    }
  };

  const handleFileSelect = (
    file: File,
    gender: BodyMapGender,
    unit: WeightUnit,
  ) => {
    onSetCsvImportError?.(null);
    onSetBodyMapGender(gender);
    onSetWeightUnit(unit);
    savePreferencesConfirmed(true);
    onSetPreferencesConfirmed(true);
    onProcessFile(file, platform, unit);
  };

  const handlePreferencesContinue = () => {
    onSetBodyMapGender(localGender);
    onSetWeightUnit(localUnit);
    savePreferencesConfirmed(true);
    onSetPreferencesConfirmed(true);
    setPhase('content');
  };

  const subtitle = subtitles[activeMethod];
  const helpLabel = helpLabels[activeMethod];

  return (
    <OnboardingModalShell
      maxWidthClassName="max-w-xl"
      header={
        phase === 'content' ? (
          <PlatformModalHeader<PlatformMethod>
            onBack={onBack}
            onClose={onClose}
            intent={intent}
            segments={methodSegments}
            activeSegment={activeMethod}
            onSegmentChange={setActiveMethod}
          />
        ) : (
          onBack ? (
            <div className="flex items-center w-full">
              <button
                type="button"
                onClick={onBack}
                className={UNIFORM_HEADER_ICON_BUTTON_CLASS}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          ) : null
        )
      }
      footer={
        phase === 'content' ? (
          <PlatformModalFooter
            helpLabel={helpLabel}
            onToggleHelp={() => setShowHelp((v) => !v)}
            showHelp={showHelp}
            onAddDataSource={onAddDataSource}
            isLoading={isAnalyzing}
          />
        ) : null
      }
    >
      {phase === 'preferences' ? (
        <div className="space-y-4">
          <CSVImportBodyTypeSelector
            selectedGender={localGender}
            onSelectGender={setLocalGender}
          />
          <CSVImportUnitSelector
            selectedUnit={localUnit}
            onSelectUnit={setLocalUnit}
          />
          <button
            type="button"
            onClick={handlePreferencesContinue}
            disabled={isAnalyzing || !localGender || !localUnit}
            className={`${UNIFORM_HEADER_BUTTON_CLASS} w-full h-11 text-sm font-semibold disabled:opacity-60 gap-2 justify-center`}
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className={`flex flex-col min-h-0 ${showHelp ? '' : 'justify-center'} ${phase === 'content' ? 'pt-1' : ''}`}>
          {!showHelp ? (
            <>
              <p
                className={`text-sm text-center mb-4 ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {subtitle}
              </p>

              {hasSavedSession && onClearCache ? (
                <div className="mb-4 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={onClearCache}
                    disabled={isAnalyzing}
                    className={`${UNIFORM_HEADER_BUTTON_CLASS} h-8 text-xs font-semibold gap-1.5`}
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    <span>Unload Data</span>
                  </button>
                </div>
              ) : null}

              {activeMethod === 'credentials' && platform === 'hevy' ? (
                <CredentialsContent
                  onLogin={handleCredentialsLogin}
                  errorMessage={activeError}
                  isLoading={isAnalyzing}
                />
              ) : null}

              {activeMethod === 'apiKey' &&
              (platform === 'hevy' || platform === 'lyfta') ? (
                <ApiKeyContent
                  platform={platform as 'hevy' | 'lyfta'}
                  onLogin={handleApiKeyLogin}
                  isLoading={isAnalyzing}
                  errorMessage={activeError}
                />
              ) : null}

              {activeMethod === 'csv' ? (
                <CsvContent
                  platform={platform}
                  onFileSelect={handleFileSelect}
                  onGenderChange={onSetBodyMapGender}
                  onUnitChange={onSetWeightUnit}
                  bodyMapGender={bodyMapGender}
                  weightUnit={weightUnit}
                  isLoading={isAnalyzing}
                  errorMessage={activeError}
                  showExportHelp={showExportHelp}
                  onToggleExportHelp={() => setShowExportHelp((v) => !v)}
                  hideBodyTypeAndUnit={preferencesConfirmed}
                />
              ) : null}
            </>
          ) : (
            <div className="flex-1">
              <p
                className={`text-sm text-center mb-4 ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {subtitle}
              </p>
              {activeMethod === 'credentials' && platform === 'hevy' ? (
                <HevyLoginHelp loginMode="credentials" />
              ) : null}
              {activeMethod === 'apiKey' && platform === 'hevy' ? (
                <HevyLoginHelp loginMode="apiKey" />
              ) : null}
              {activeMethod === 'apiKey' && platform === 'lyfta' ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2"
                >
                  <p className="text-xs text-purple-100 font-semibold">
                    How to get your Lyfta API key:
                  </p>
                  <ol className="text-xs text-purple-100/80 space-y-1 list-decimal list-inside">
                    <li>
                      Go to{' '}
                      <a
                        href="https://my.lyfta.app/community/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-purple-300 hover:text-purple-200 underline"
                      >
                        my.lyfta.app/community/api
                      </a>
                    </li>
                    <li>
                      Click the blue{' '}
                      <span className="font-semibold text-purple-200">
                        Generate API Key
                      </span>{' '}
                      button
                    </li>
                  </ol>
                  <p className="text-xs text-purple-100/60">
                    Seeing{' '}
                    <span className="text-red-300">"Key not found"</span>? You
                    need to sign in to Lyfta first, then try again.
                  </p>
                </motion.div>
              ) : null}
              {activeMethod === 'csv' &&
              platform !== 'other' &&
              platform !== 'motra' ? (
                <CSVExportHelp platform={platform} />
              ) : null}
              {activeMethod === 'csv' &&
              (platform === 'other' || platform === 'motra') ? (
                <div
                  className={`rounded-lg border p-4 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-800/20 border-slate-700/50'
                  }`}
                >
                  <p
                    className={`text-xs font-semibold ${
                      isLight ? 'text-slate-700' : 'text-slate-200'
                    }`}
                  >
                    How to export your data:
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    Export your workout data as a CSV file from your app, then
                    upload it here.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </OnboardingModalShell>
  );
}

export default UnifiedPlatformModal;
