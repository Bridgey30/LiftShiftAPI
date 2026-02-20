import { useState, useCallback, useMemo, useEffect } from 'react';
import { WorkoutSet } from '../../types';
import { WeightUnit } from '../../utils/storage/localStorage';
import type { DataSourceChoice } from '../../utils/storage/dataSourceStorage';
import type { OnboardingFlow } from '../../app/onboarding/types';
import type { AppAuthHandlersDeps } from './appAuthHandlers';
import {
  runCsvImport,
  runHevyApiKeyLogin,
  runHevyLogin,
  runHevySyncSaved,
  runLyfatLogin,
  runLyfatSyncSaved,
} from './appAuthHandlers';

export interface UseAppAuthReturn {
  hevyLoginError: string | null;
  lyfatLoginError: string | null;
  csvImportError: string | null;
  loadingKind: 'hevy' | 'lyfta' | 'csv' | null;
  isAnalyzing: boolean;
  isCompleting: boolean;
  setLoadingKind: (kind: 'hevy' | 'lyfta' | 'csv' | null) => void;
  setIsAnalyzing: (value: boolean) => void;
  startProgress: () => number;
  finishProgress: (startedAt: number) => void;
  handleHevySyncSaved: () => void;
  handleHevyApiKeyLogin: (apiKey: string) => void;
  handleHevyLogin: (emailOrUsername: string, password: string) => void;
  handleLyfatSyncSaved: () => void;
  handleLyfatLogin: (apiKey: string) => void;
  processFile: (file: File, platform: DataSourceChoice, unitOverride?: WeightUnit) => void;
  clearHevyLoginError: () => void;
  clearLyfatLoginError: () => void;
  clearCsvImportError: () => void;
}

export interface UseAppAuthProps {
  weightUnit: WeightUnit;
  setParsedData: (data: WorkoutSet[]) => void;
  setDataSource: (source: DataSourceChoice | null) => void;
  setOnboarding: (flow: OnboardingFlow | null) => void;
  setSelectedMonth: (month: string) => void;
  setSelectedDay: (day: Date | null) => void;
}

export function useAppAuth({
  weightUnit,
  setParsedData,
  setDataSource,
  setOnboarding,
  setSelectedMonth,
  setSelectedDay,
}: UseAppAuthProps): UseAppAuthReturn {
  const [hevyLoginError, setHevyLoginError] = useState<string | null>(null);
  const [lyfatLoginError, setLyfatLoginError] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [loadingKind, setLoadingKind] = useState<'hevy' | 'lyfta' | 'csv' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const startProgress = useCallback((): number => {
    setIsCompleting(false);
    return Date.now();
  }, []);

  const finishProgress = useCallback((startedAt: number): void => {
    setIsCompleting(true);
    // Brief moment to show completed state, then hide
    window.setTimeout(() => {
      setIsAnalyzing(false);
      setLoadingKind(null);
      setIsCompleting(false);
    }, 250);
  }, []);

  const handlerDeps = useMemo<AppAuthHandlersDeps>(
    () => ({
      weightUnit,
      isAnalyzing,
      setParsedData,
      setDataSource,
      setOnboarding,
      setSelectedMonth,
      setSelectedDay,
      setHevyLoginError,
      setLyfatLoginError,
      setCsvImportError,
      setLoadingKind,
      setIsAnalyzing,
      startProgress,
      finishProgress,
    }),
    [
      weightUnit,
      isAnalyzing,
      setParsedData,
      setDataSource,
      setOnboarding,
      setSelectedMonth,
      setSelectedDay,
      setHevyLoginError,
      setLyfatLoginError,
      setCsvImportError,
      setLoadingKind,
      setIsAnalyzing,
      startProgress,
      finishProgress,
    ]
  );

  const handleHevySyncSaved = useCallback(() => runHevySyncSaved(handlerDeps), [handlerDeps]);
  const handleHevyApiKeyLogin = useCallback(
    (apiKey: string) => runHevyApiKeyLogin(handlerDeps, apiKey),
    [handlerDeps]
  );
  const handleHevyLogin = useCallback(
    (emailOrUsername: string, password: string) => {
      if (isAnalyzing) return;
      runHevyLogin(handlerDeps, emailOrUsername, password);
    },
    [handlerDeps, isAnalyzing]
  );
  const handleLyfatSyncSaved = useCallback(() => runLyfatSyncSaved(handlerDeps), [handlerDeps]);
  const handleLyfatLogin = useCallback((apiKey: string) => runLyfatLogin(handlerDeps, apiKey), [handlerDeps]);
  const processFile = useCallback(
    (file: File, platform: DataSourceChoice, unitOverride?: WeightUnit) =>
      runCsvImport(handlerDeps, file, platform, unitOverride),
    [handlerDeps]
  );

  return {
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
    clearHevyLoginError: () => setHevyLoginError(null),
    clearLyfatLoginError: () => setLyfatLoginError(null),
    clearCsvImportError: () => setCsvImportError(null),
  };
}
