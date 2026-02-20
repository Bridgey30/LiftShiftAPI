import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  getHeadlessIdForDetailedSvgId,
  HEADLESS_MUSCLE_NAMES,
  type HeadlessMuscleId,
} from '../../../utils/muscle/mapping';
import { WeeklySetsWindow } from '../../../utils/muscle/analytics';

export type ViewMode = 'headless';

export interface InitialMuscleSelection {
  muscleId: string;
  viewMode?: ViewMode;
}

export interface UseMuscleSelectionProps {
  initialMuscle?: InitialMuscleSelection | null;
  initialWeeklySetsWindow?: WeeklySetsWindow | null;
  onInitialMuscleConsumed?: () => void;
  isLoading: boolean;
}

export interface UseMuscleSelectionReturn {
  selectedMuscle: string | null;
  setSelectedMuscle: React.Dispatch<React.SetStateAction<string | null>>;
  viewMode: ViewMode;
  weeklySetsWindow: WeeklySetsWindow;
  setWeeklySetsWindow: React.Dispatch<React.SetStateAction<WeeklySetsWindow>>;
  selectedSvgIdForUrlRef: React.MutableRefObject<string | null>;
  clearSelectionUrl: () => void;
  updateSelectionUrl: (opts: { svgId: string; mode: ViewMode; window: WeeklySetsWindow }) => void;
  clearSelection: () => void;
}



export function useMuscleSelection({
  initialMuscle,
  initialWeeklySetsWindow,
  onInitialMuscleConsumed,
  isLoading,
}: UseMuscleSelectionProps): UseMuscleSelectionReturn {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const viewMode: ViewMode = 'headless';
  const [weeklySetsWindow, setWeeklySetsWindow] = useState<WeeklySetsWindow>('30d');

  // Track the selected SVG id for URL round-tripping
  const selectedSvgIdForUrlRef = useRef<string | null>(null);

  const clearSelectionUrl = useCallback(() => {
    navigate({ pathname: location.pathname, search: '' });
  }, [navigate, location.pathname]);

  const updateSelectionUrl = useCallback(
    (opts: { svgId: string; window: WeeklySetsWindow }) => {
      const params = new URLSearchParams();
      params.set('muscle', opts.svgId);
      params.set('window', opts.window);
      navigate({ pathname: location.pathname, search: `?${params.toString()}` });
    },
    [navigate, location.pathname]
  );

  // Apply initial muscle selection from dashboard navigation
  useEffect(() => {
    if (initialMuscle && !isLoading) {
      selectedSvgIdForUrlRef.current = initialMuscle.muscleId;
      // For headless mode, URL can contain either a headless id (preferred) or a detailed svg id.
      const headless = (HEADLESS_MUSCLE_NAMES as any)[initialMuscle.muscleId]
        ? (initialMuscle.muscleId as HeadlessMuscleId)
        : getHeadlessIdForDetailedSvgId(initialMuscle.muscleId);
      if (headless) {
        setSelectedMuscle(headless);
        // Ensure we keep URL round-trippable with a stable headless id.
        selectedSvgIdForUrlRef.current = headless;
      }
      onInitialMuscleConsumed?.();
    }
  }, [initialMuscle, isLoading, onInitialMuscleConsumed]);

  // Apply initial weekly sets window from dashboard navigation
  useEffect(() => {
    if (initialWeeklySetsWindow && !isLoading) {
      setWeeklySetsWindow(initialWeeklySetsWindow);
    }
  }, [initialWeeklySetsWindow, isLoading]);

  const clearSelection = useCallback(() => {
    setSelectedMuscle(null);
    selectedSvgIdForUrlRef.current = null;
    clearSelectionUrl();
  }, [clearSelectionUrl]);

  return {
    selectedMuscle,
    setSelectedMuscle,
    viewMode,
    weeklySetsWindow,
    setWeeklySetsWindow,
    selectedSvgIdForUrlRef,
    clearSelectionUrl,
    updateSelectionUrl,
    clearSelection,
  };
}
