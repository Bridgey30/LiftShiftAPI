import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { WorkoutSet } from './types';
import { Tab } from './app/navigation';
import { AppOnboardingLayer } from './components/app/AppOnboardingLayer';
import { AppLoadingOverlay } from './components/app/AppLoadingOverlay';
import { UserPreferencesModal } from './components/modals/userPreferences/UserPreferencesModal';
import type { OnboardingFlow } from './app/onboarding/types';
import { getEffectiveNowFromWorkoutData } from './utils/date/dateUtils';
import { getDataSourceChoice, getSetupComplete } from './utils/storage/dataSourceStorage';
import { clearCacheAndRestart as clearCacheAndRestartNow } from './app/state';
import { usePrefetchHeavyViews } from './app/navigation';
import { useStartupAutoLoad } from './app/startup';
import { usePlatformDeepLink } from './app/navigation';
import { useAppAuth } from './hooks/auth';
import { useAppNavigation } from './hooks/app';
import { useAppCalendarFilters } from './hooks/app';
import { useAppPreferences } from './hooks/app';
import { AppFilterControls } from './app/ui';
import { AppShell } from './app/ui';
import { useAppSideEffects } from './app/state';
import { useAppDerivedData } from './app/state';
import { useCalendarSelectionHandlers } from './app/state';
import { useUpdateFlowHandler } from './app/auth';

const CHUNK_RELOAD_KEY = 'liftshift_chunk_reload_once';

const CHUNK_LOAD_ERROR_PATTERNS = [
  'dynamically imported module',
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'disallowed mime type',
];

const isChunkLoadError = (value: unknown): boolean => {
  const msg =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : typeof (value as any)?.message === 'string'
          ? (value as any).message
          : '';

  if (!msg) return false;
  const lower = msg.toLowerCase();
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
};

const tryRecoverFromChunkLoadError = (): void => {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  } catch {
    window.location.reload();
  }
};

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onVitePreloadError = (event: Event) => {
      const payload = (event as any)?.payload;
      if (!isChunkLoadError(payload)) return;
      event.preventDefault();
      tryRecoverFromChunkLoadError();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      tryRecoverFromChunkLoadError();
    };

    window.addEventListener('vite:preloadError', onVitePreloadError as EventListener);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('vite:preloadError', onVitePreloadError as EventListener);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useLayoutEffect(() => {
    try {
      const rawSearch = window.location.search || '';
      if (!rawSearch.includes('p=')) return;

      const params = new URLSearchParams(rawSearch);
      const p = params.get('p');
      if (!p) return;

      const q = params.get('q');
      const h = params.get('h');

      params.delete('p');
      params.delete('q');
      params.delete('h');

      const rest = params.toString();
      const nextSearch = (q ? decodeURIComponent(q) : '') || (rest ? `?${rest}` : '');
      const nextHash = h ? decodeURIComponent(h) : '';
      const nextPath = decodeURIComponent(p);

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const desired = `${nextPath}${nextSearch}${nextHash}`;
      if (current === desired) return;

      navigate({ pathname: nextPath, search: nextSearch, hash: nextHash }, { replace: true });
    } catch {
      // ignore
    }
  }, [navigate]);

  const [parsedData, setParsedData] = useState<WorkoutSet[]>([]);
  const [hasHydratedData, setHasHydratedData] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingFlow | null>(() => {
    return getSetupComplete() ? null : { intent: 'initial', step: 'platform' };
  });
  const [dataSource, setDataSource] = useState(() => getDataSourceChoice());
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);

  const {
    mode,
    setMode,
    weightUnit,
    setWeightUnit,
    bodyMapGender,
    setBodyMapGender,
    dateMode,
    setDateMode,
    exerciseTrendMode,
    setExerciseTrendMode,
  } = useAppPreferences();

  const {
    activeTab,
    highlightedExercise,
    initialMuscleForAnalysis,
    initialWeeklySetsWindow,
    targetHistoryDate,
    mainRef,
    handleExerciseClick,
    handleMuscleClick,
    handleDayClick,
    handleTargetDateConsumed,
    handleSelectTab,
    clearHighlightedExercise,
    clearInitialMuscleForAnalysis,
  } = useAppNavigation();

  const {
    selectedMonth,
    selectedDay,
    selectedRange,
    selectedWeeks,
    calendarOpen,
    filteredData,
    hasActiveCalendarFilter,
    calendarSummaryText,
    minDate,
    maxDate,
    availableDatesSet,
    filterCacheKey,
    setSelectedMonth,
    setSelectedDay,
    setSelectedRange,
    setSelectedWeeks,
    setCalendarOpen,
    toggleCalendarOpen,
    clearAllFilters,
  } = useAppCalendarFilters({
    parsedData,
    effectiveNow: useMemo(() => {
      const dataBasedNow = getEffectiveNowFromWorkoutData(parsedData, new Date(0));
      return dateMode === 'actual' ? new Date() : dataBasedNow;
    }, [parsedData, dateMode]),
  });

  const {
    hevyLoginError,
    lyfatLoginError,
    csvImportError,
    loadingKind,
    isAnalyzing,
    isCompleting,
    setLoadingKind,
    setIsAnalyzing,
    startProgress,
    finishProgress,
    handleHevySyncSaved,
    handleHevyApiKeyLogin,
    handleHevyLogin,
    handleLyfatSyncSaved,
    handleLyfatLogin,
    processFile,
    clearHevyLoginError,
    clearLyfatLoginError,
    clearCsvImportError,
  } = useAppAuth({
    weightUnit,
    setParsedData: (data) => {
      setParsedData(data);
      if (data.length > 0) setHasHydratedData(true);
    },
    setDataSource,
    setOnboarding,
    setSelectedMonth,
    setSelectedDay,
  });

  const platformQueryConsumedRef = { current: false };
  usePlatformDeepLink({ location, navigate, setOnboarding, platformQueryConsumedRef });
  useAppSideEffects({ onboardingIntent: onboarding?.intent ?? null, dataSource, location });
  usePrefetchHeavyViews();

  useStartupAutoLoad({
    parsedData,
    setOnboarding,
    setDataSource,
    setParsedData: (data) => {
      setParsedData(data);
      if (data.length > 0) setHasHydratedData(true);
    },
    setHevyLoginError: clearHevyLoginError,
    setLyfatLoginError: clearLyfatLoginError,
    setCsvImportError: clearCsvImportError,
    setIsAnalyzing,
    isAnalyzing,
    setLoadingKind,
    startProgress,
    finishProgress,
  });

  const { filteredEffectiveNow, calendarEffectiveNow, dataAgeInfo, dailySummaries, exerciseStats } = useAppDerivedData({
    parsedData,
    filteredData,
    filterCacheKey,
    dateMode,
  });

  const filterControls = (
    <AppFilterControls
      hasActiveCalendarFilter={hasActiveCalendarFilter}
      calendarSummaryText={calendarSummaryText}
      setCalendarOpen={setCalendarOpen}
      clearAllFilters={clearAllFilters}
      toggleCalendarOpen={toggleCalendarOpen}
    />
  );

  const desktopFilterControls = <div className="hidden sm:block">{filterControls}</div>;

  const clearCacheAndRestart = useCallback(() => {
    clearCacheAndRestartNow();
  }, []);

  const handleHistoryDayTitleClick = useCallback(
    (date: Date) => {
      setSelectedDay(date);
      setSelectedRange(null);
      setSelectedWeeks([]);
      setSelectedMonth('all');
      handleSelectTab(Tab.MUSCLE_ANALYSIS);
    },
    [setSelectedDay, setSelectedRange, setSelectedWeeks, setSelectedMonth, handleSelectTab]
  );

  const handleOpenUpdateFlow = useUpdateFlowHandler({
    dataSource,
    setOnboarding,
    clearCsvImportError,
    clearHevyLoginError,
    clearLyfatLoginError,
  });

  const calendarHandlers = useCalendarSelectionHandlers({
    setSelectedDay,
    setSelectedRange,
    setSelectedWeeks,
    setCalendarOpen,
  });

  const showColdStartOverlay = onboarding?.intent !== 'initial' && parsedData.length === 0 && !hasHydratedData;

  return (
    <div
      className="flex flex-col min-h-[100svh] h-[100dvh] overscroll-none bg-transparent text-[color:var(--app-fg)] font-sans"
      style={{ background: 'var(--app-bg)' }}
    >
      <AppShell
        onboardingIntent={onboarding?.intent ?? null}
        onSetOnboarding={setOnboarding}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenUpdateFlow={handleOpenUpdateFlow}
        onOpenPreferences={() => setPreferencesModalOpen(true)}
        calendarOpen={calendarOpen}
        onToggleCalendarOpen={toggleCalendarOpen}
        onCloseCalendar={() => setCalendarOpen(false)}
        hasActiveCalendarFilter={hasActiveCalendarFilter}
        onClearCalendarFilter={clearAllFilters}
        calendarEffectiveNow={calendarEffectiveNow}
        selectedDay={selectedDay}
        selectedRange={selectedRange}
        selectedWeeks={selectedWeeks}
        minDate={minDate}
        maxDate={maxDate}
        availableDatesSet={availableDatesSet}
        onSelectWeeks={calendarHandlers.onSelectWeeks}
        onSelectDay={calendarHandlers.onSelectDay}
        onSelectWeek={calendarHandlers.onSelectWeek}
        onSelectMonth={calendarHandlers.onSelectMonth}
        onSelectYear={calendarHandlers.onSelectYear}
        onClearCalendar={clearAllFilters}
        onApplyCalendar={calendarHandlers.onApplyCalendar}
        mainRef={mainRef}
        hasActiveFilters={hasActiveCalendarFilter}
        dailySummaries={dailySummaries}
        exerciseStats={exerciseStats}
        filteredData={filteredData}
        filterCacheKey={filterCacheKey}
        filtersSlot={desktopFilterControls}
        highlightedExercise={highlightedExercise}
        onHighlightApplied={clearHighlightedExercise}
        onDayClick={handleDayClick}
        onMuscleClick={handleMuscleClick}
        onExerciseClick={handleExerciseClick}
        onHistoryDayTitleClick={handleHistoryDayTitleClick}
        targetHistoryDate={targetHistoryDate}
        onTargetHistoryDateConsumed={handleTargetDateConsumed}
        initialMuscleForAnalysis={initialMuscleForAnalysis}
        initialWeeklySetsWindow={initialWeeklySetsWindow}
        onInitialMuscleConsumed={clearInitialMuscleForAnalysis}
        bodyMapGender={bodyMapGender}
        weightUnit={weightUnit}
        exerciseTrendMode={exerciseTrendMode}
        now={filteredEffectiveNow}
      />

      <UserPreferencesModal
        isOpen={preferencesModalOpen}
        onClose={() => setPreferencesModalOpen(false)}
        weightUnit={weightUnit}
        onWeightUnitChange={setWeightUnit}
        bodyMapGender={bodyMapGender}
        onBodyMapGenderChange={setBodyMapGender}
        themeMode={mode}
        onThemeModeChange={setMode}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        exerciseTrendMode={exerciseTrendMode}
        onExerciseTrendModeChange={setExerciseTrendMode}
        dataAgeInfo={dataAgeInfo}
      />

      <AppOnboardingLayer
        onboarding={onboarding}
        dataSource={dataSource}
        bodyMapGender={bodyMapGender}
        weightUnit={weightUnit}
        isAnalyzing={isAnalyzing}
        csvImportError={csvImportError}
        hevyLoginError={hevyLoginError}
        lyfatLoginError={lyfatLoginError}
        onSetOnboarding={(next) => setOnboarding(next)}
        onSetBodyMapGender={setBodyMapGender}
        onSetWeightUnit={setWeightUnit}
        onSetCsvImportError={clearCsvImportError}
        onSetHevyLoginError={clearHevyLoginError}
        onSetLyfatLoginError={clearLyfatLoginError}
        onClearCacheAndRestart={clearCacheAndRestart}
        onProcessFile={processFile}
        onHevyLogin={handleHevyLogin}
        onHevyApiKeyLogin={handleHevyApiKeyLogin}
        onHevySyncSaved={handleHevySyncSaved}
        onLyfatLogin={handleLyfatLogin}
        onLyfatSyncSaved={handleLyfatSyncSaved}
      />

      <AppLoadingOverlay open={isAnalyzing || showColdStartOverlay} isCompleting={isCompleting} />
    </div>
  );
};

export default App;
