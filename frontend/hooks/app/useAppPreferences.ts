import { useState, useEffect, useLayoutEffect } from 'react';
import { useTheme } from '../../components/theme/ThemeProvider';
import { setContext } from '../../utils/integrations/analytics';
import {
  WeightUnit,
  getWeightUnit,
  saveWeightUnit,
  StoredBodyMapGender,
  getBodyMapGender,
  saveBodyMapGender,
  DateMode,
  getDateMode,
  saveDateMode,
  ExerciseTrendMode,
  getExerciseTrendMode,
  saveExerciseTrendMode,
} from '../../utils/storage/localStorage';
import { BodyMapGender } from '../../components/bodyMap/BodyMap';

export interface UseAppPreferencesReturn {
  // Theme
  mode: string;
  setMode: (mode: string) => void;
  
  // Weight unit
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  
  // Body map gender
  bodyMapGender: BodyMapGender;
  setBodyMapGender: (gender: BodyMapGender) => void;
  
  // Date mode
  dateMode: DateMode;
  setDateMode: (mode: DateMode) => void;
  
  // Exercise trend mode
  exerciseTrendMode: ExerciseTrendMode;
  setExerciseTrendMode: (mode: ExerciseTrendMode) => void;
}

export function useAppPreferences(): UseAppPreferencesReturn {
  const { mode, setMode } = useTheme();
  
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>(() => getWeightUnit());
  const [bodyMapGender, setBodyMapGenderState] = useState<BodyMapGender>(() => getBodyMapGender());
  const [dateMode, setDateModeState] = useState<DateMode>(() => getDateMode());
  const [exerciseTrendMode, setExerciseTrendModeState] = useState<ExerciseTrendMode>(() => getExerciseTrendMode());

  // Persist weight unit
  useEffect(() => {
    saveWeightUnit(weightUnit);
    setContext({ weight_unit: weightUnit });
  }, [weightUnit]);

  // Persist body map gender
  useEffect(() => {
    saveBodyMapGender(bodyMapGender as StoredBodyMapGender);
    setContext({ body_map_gender: bodyMapGender });
  }, [bodyMapGender]);

  // Persist date mode
  useEffect(() => {
    saveDateMode(dateMode);
  }, [dateMode]);

  // Persist exercise trend mode
  useEffect(() => {
    saveExerciseTrendMode(exerciseTrendMode);
  }, [exerciseTrendMode]);

  // Apply CSS variables - always use multicolor
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--heatmap-hue', 'multicolor');
    root.style.setProperty('--bodymap-hover-rgb', '14 90 182');
    root.style.setProperty('--bodymap-selection-rgb', '37 99 235');
  }, []);

  return {
    mode,
    setMode,
    weightUnit,
    setWeightUnit: setWeightUnitState,
    bodyMapGender,
    setBodyMapGender: setBodyMapGenderState,
    dateMode,
    setDateMode: setDateModeState,
    exerciseTrendMode,
    setExerciseTrendMode: setExerciseTrendModeState,
  };
}
