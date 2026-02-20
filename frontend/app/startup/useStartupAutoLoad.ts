import { useEffect, useRef } from 'react';

import { getCSVData, getPreferencesConfirmed, getWeightUnit, savePreferencesConfirmed } from '../../utils/storage/localStorage';
import {
  getDataSourceChoice,
  getHevyAuthToken,
  getHevyProApiKey,
  getLastCsvPlatform,
  getLastLoginMethod,
  getLyfataApiKey,
  getSetupComplete,
  saveSetupComplete,
  type DataSourceChoice,
  type LoginMethod,
} from '../../utils/storage/dataSourceStorage';
import { getHevyUsernameOrEmail, getHevyPassword } from '../../utils/storage/hevyCredentialsStorage';

import { loadCsvAuto } from './startupAutoLoadCsv';
import { loadLyftaFromApiKey } from './startupAutoLoadLyfta';
import { loadHevyFromProKey, loadHevyFromToken, loadHevyFromCredentials } from './startupAutoLoadHevy';
import type { StartupAutoLoadParams } from './startupAutoLoadTypes';

export type { StartupAutoLoadParams } from './startupAutoLoadTypes';

export const useStartupAutoLoad = (params: StartupAutoLoadParams): void => {
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple attempts
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    // If dashboard already has data, don't auto-reload
    if (params.parsedData.length > 0) return;

    if (!getSetupComplete()) return;

    if (!getPreferencesConfirmed()) {
      savePreferencesConfirmed(true);
    }

    const storedChoice = getDataSourceChoice();
    if (!storedChoice) {
      saveSetupComplete(false);
      params.setIsAnalyzing(false);
      params.setLoadingKind(null);
      params.setOnboarding({ intent: 'initial', step: 'platform' });
      return;
    }

    if (params.isAnalyzing) return;

    // IMMEDIATELY show loading overlay before any async operations
    // This prevents showing an empty dashboard
    params.setLoadingKind(storedChoice === 'hevy' ? 'hevy' : storedChoice === 'lyfta' ? 'lyfta' : 'csv');
    params.setIsAnalyzing(true);

    params.setDataSource(storedChoice);
    console.log('[StartupAutoLoad] Starting', {
      storedChoice,
      hasHevyToken: Boolean(getHevyAuthToken()),
      hasHevyProApiKey: Boolean(getHevyProApiKey()),
      hasLyftaApiKey: Boolean(getLyfataApiKey()),
      hasCsvData: Boolean(getCSVData()),
    });

    const hevyAccountKey = storedChoice === 'hevy' ? (getHevyUsernameOrEmail() ?? undefined) : undefined;
    const lastMethod = getLastLoginMethod(storedChoice, hevyAccountKey);

    const storedCSV = getCSVData();
    const lastCsvPlatform = getLastCsvPlatform();
    const weightUnit = getWeightUnit();

    const resetToPlatform = () => {
      saveSetupComplete(false);
      params.setIsAnalyzing(false);
      params.setLoadingKind(null);
      params.setOnboarding({ intent: 'initial', step: 'platform' });
    };

    // Unified retry wrapper
    const attemptReload = async (
      platform: DataSourceChoice,
      method: LoginMethod | null
    ): Promise<boolean> => {
      // Platform: Strong / Other - only CSV
      if (platform === 'strong' || platform === 'other') {
        if (!storedCSV || lastCsvPlatform !== platform) {
          resetToPlatform();
          return false;
        }

        loadCsvAuto(params, {
          platform,
          storedCSV,
          weightUnit,
          clearLoginErrors: () => params.setHevyLoginError(null),
        });
        // CSV loading completes asynchronously; dashboard updates via setParsedData
        return true;
      }

      // Platform: Lyfta
      if (platform === 'lyfta') {
        const lyftaApiKey = getLyfataApiKey();

        // Try API key first (preferred for power users)
        if ((method === 'apiKey' || !method) && lyftaApiKey) {
          loadLyftaFromApiKey(params, lyftaApiKey);
          return true;
        }

        // Fallback to CSV
        if ((method === 'csv' || !method) && storedCSV && lastCsvPlatform === 'lyfta') {
          loadCsvAuto(params, {
            platform: 'lyfta',
            storedCSV,
            weightUnit,
            clearLoginErrors: () => params.setLyfatLoginError(null),
          });
          return true;
        }

        // No valid method found
        resetToPlatform();
        return false;
      }

      // Platform: Hevy
      if (platform === 'hevy') {
        const hevyProApiKey = getHevyProApiKey();
        const token = getHevyAuthToken();
        const username = getHevyUsernameOrEmail();
        const password = getHevyPassword();
        const hasCredentials = Boolean(username && password);

        // If user last used API key, keep that as the primary path.
        if (method === 'apiKey' && hevyProApiKey) {
          loadHevyFromProKey(params, hevyProApiKey);
          return true;
        }

        // Priority 1: Token
        if (token) {
          loadHevyFromToken(params, token, {
            successMethod: 'saved_auth_token',
            errorMethod: 'saved_auth_token',
          });
          return true;
        }

        // Priority 2: Credentials (auto-relogin)
        if (hasCredentials && username && password) {
          const success = await loadHevyFromCredentials(params, username, password);
          if (success) return true;
        }

        // Priority 3: API key fallback
        if (hevyProApiKey) {
          loadHevyFromProKey(params, hevyProApiKey);
          return true;
        }

        // Priority 5: CSV fallback
        if (storedCSV && lastCsvPlatform === 'hevy') {
          loadCsvAuto(params, {
            platform: 'hevy',
            storedCSV,
            weightUnit,
            clearLoginErrors: () => params.setHevyLoginError(null),
          });
          return true;
        }

        // Nothing worked
        resetToPlatform();
        return false;
      }

      resetToPlatform();
      return false;
    };

    // Execute auto-reload
    attemptReload(storedChoice, lastMethod).catch((err) => {
      console.error('[StartupAutoLoad] Unexpected failure', err);
      resetToPlatform();
    });
  }, []);
};
