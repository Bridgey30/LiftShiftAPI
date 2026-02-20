import { WorkoutSet } from '../../types';
import {
  hevyBackendGetAccount,
  hevyBackendGetSets,
  hevyBackendGetSetsWithProApiKey,
  hevyBackendLogin,
  hevyBackendRefresh,
} from '../../utils/api/hevyBackend';
import { identifyPersonalRecords } from '../../utils/analysis/core';
import {
  clearHevyAuthToken,
  clearHevyProApiKey,
  clearHevyRefreshToken,
  getHevyRefreshToken,
  saveHevyAuthToken,
  saveHevyAuthExpiresAt,
  saveHevyRefreshToken,
  saveLastLoginMethod,
  saveSetupComplete,
} from '../../utils/storage/dataSourceStorage';
import {
  getHevyPassword,
  getHevyUsernameOrEmail,
  saveHevyPassword,
  saveHevyUsernameOrEmail,
} from '../../utils/storage/hevyCredentialsStorage';
import { hydrateBackendWorkoutSets } from '../auth/hydrateBackendWorkoutSets';
import { getHevyErrorMessage } from '../ui/appErrorMessages';
import { trackEvent } from '../../utils/integrations/analytics';
import type { StartupAutoLoadParams } from './startupAutoLoadTypes';


interface TokenTrackConfig {
  successMethod: string;
  errorMethod: string;
}

export const loadHevyFromProKey = (deps: StartupAutoLoadParams, apiKey: string): void => {
  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  hevyBackendGetSetsWithProApiKey<WorkoutSet>(apiKey)
    .then((resp) => {
      const sets = resp.sets ?? [];

      // Instant processing
      const hydrated = hydrateBackendWorkoutSets(sets);
      if (hydrated.length === 0 || hydrated.every((s) => !s.parsedDate)) {
        clearHevyProApiKey();
        saveSetupComplete(false);
        deps.setHevyLoginError('Hevy data could not be parsed. Please try syncing again.');
        deps.setOnboarding({ intent: 'initial', step: 'platform' });
        return;
      }

      const enriched = identifyPersonalRecords(hydrated);
      deps.setParsedData(enriched);
      deps.setHevyLoginError(null);
      deps.setCsvImportError(null);
    })
    .catch((err) => {
      clearHevyProApiKey();
      saveSetupComplete(false);
      deps.setHevyLoginError(getHevyErrorMessage(err));
      deps.setOnboarding({ intent: 'initial', step: 'platform' });
    })
    .finally(() => {
      deps.finishProgress(startedAt);
    });
};

export const loadHevyFromToken = (
  deps: StartupAutoLoadParams,
  token: string,
  trackConfig?: TokenTrackConfig
): void => {
  const savedRefreshToken = getHevyRefreshToken();
  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  const fetchSetsWithToken = (accessToken: string) =>
    hevyBackendGetAccount(accessToken)
      .then(({ username }) => hevyBackendGetSets<WorkoutSet>(accessToken, username));

  const applySetsResponse = (resp: { sets?: WorkoutSet[]; meta?: { workouts?: number } }): void => {
    if (trackConfig) {
      trackEvent('hevy_sync_success', { method: trackConfig.successMethod, workouts: resp.meta?.workouts });
    }
    const sets = resp.sets ?? [];

    const hydrated = hydrateBackendWorkoutSets(sets);
    if (hydrated.length === 0 || hydrated.every((s) => !s.parsedDate)) {
      clearHevyAuthToken();
      saveSetupComplete(false);
      deps.setHevyLoginError('Hevy data could not be parsed. Please try syncing again.');
      deps.setOnboarding({ intent: 'initial', step: 'platform' });
      return;
    }

    const enriched = identifyPersonalRecords(hydrated);
    deps.setParsedData(enriched);
    deps.setHevyLoginError(null);
    deps.setCsvImportError(null);
  };

  const attemptCredentialFallback = () => {
    const username = getHevyUsernameOrEmail();
    const password = getHevyPassword();
    if (!username || !password) return Promise.reject(new Error('Missing saved credentials'));
    return loadHevyFromCredentials(deps, username, password).then((success) => {
      if (!success) throw new Error('Credential login failed');
    });
  };

  const attemptRefreshFallback = () => {
    const username = getHevyUsernameOrEmail();
    if (!savedRefreshToken) return Promise.reject(new Error('Missing saved refresh token'));
    return hevyBackendRefresh(token, savedRefreshToken, username)
      .then((r) => {
        if (!r.auth_token) throw new Error('Missing auth token');
        saveHevyAuthToken(r.auth_token);
        saveHevyAuthExpiresAt(r.expires_at ?? null);
        if (r.refresh_token) saveHevyRefreshToken(r.refresh_token);
        return fetchSetsWithToken(r.auth_token);
      });
  };

  const initialPromise = fetchSetsWithToken(token);

  initialPromise
    .then((resp) => {
      applySetsResponse(resp);
    })
    .catch((err) => {
      if (trackConfig) {
        trackEvent('hevy_sync_error', { method: trackConfig.errorMethod });
      }
      const status = (err as any)?.statusCode;
      if (status && status !== 401) {
        clearHevyAuthToken();
        saveSetupComplete(false);
        deps.setHevyLoginError(getHevyErrorMessage(err));
        deps.setOnboarding({ intent: 'initial', step: 'platform' });
        return undefined;
      }
      return attemptRefreshFallback()
        .catch(() => attemptCredentialFallback())
        .catch(() => {
          clearHevyAuthToken();
          saveSetupComplete(false);
          deps.setHevyLoginError(getHevyErrorMessage(err));
          deps.setOnboarding({ intent: 'initial', step: 'platform' });
          return undefined;
        });
    })
    .then((resp) => {
      if (!resp) return;
      applySetsResponse(resp);
    })
    .finally(() => {
      deps.finishProgress(startedAt);
    });
};

export const loadHevyFromCredentials = async (
  deps: StartupAutoLoadParams,
  username: string,
  password: string
): Promise<boolean> => {
  // Validate password before attempting login
  if (!password || password.trim().length === 0) {
    return false;
  }

  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  try {
    const loginResp = await hevyBackendLogin(username, password);

    if (!loginResp.auth_token) {
      throw new Error('Missing auth token');
    }

    saveHevyAuthToken(loginResp.auth_token);
    saveHevyAuthExpiresAt(loginResp.expires_at ?? null);
    if (loginResp.refresh_token) saveHevyRefreshToken(loginResp.refresh_token);
    else clearHevyRefreshToken();
    saveHevyUsernameOrEmail(username);
    saveHevyPassword(password);
    saveLastLoginMethod('hevy', 'credentials', username);

    const { username: accountUsername } = await hevyBackendGetAccount(loginResp.auth_token);
    const resp = await hevyBackendGetSets<WorkoutSet>(loginResp.auth_token, accountUsername);

    trackEvent('hevy_sync_success', { method: 'auto_credentials_reload', workouts: resp.meta?.workouts });

    const sets = resp.sets ?? [];
    const hydrated = hydrateBackendWorkoutSets(sets);

    if (hydrated.length === 0 || hydrated.every((s) => !s.parsedDate)) {
      clearHevyAuthToken();
      saveSetupComplete(false);
      deps.setHevyLoginError('Hevy data could not be parsed. Please try syncing again.');
      deps.setOnboarding({ intent: 'initial', step: 'platform' });
      deps.finishProgress(startedAt);
      return false;
    }

    const enriched = identifyPersonalRecords(hydrated);
    deps.setParsedData(enriched);
    deps.setHevyLoginError(null);
    deps.setCsvImportError(null);
    deps.finishProgress(startedAt);
    return true;
  } catch (err) {
    trackEvent('hevy_sync_error', { method: 'auto_credentials_reload' });
    clearHevyAuthToken();
    saveSetupComplete(false);
    deps.setHevyLoginError(getHevyErrorMessage(err));
    deps.setOnboarding({ intent: 'initial', step: 'platform' });
    deps.finishProgress(startedAt);
    return false;
  }
};
