import { mergeAnalyticsHeaders } from '../integrations/analyticsClientId';
import { buildBackendUrl, parseError, type BackendSetsResponse } from './common';
import { browserCache } from '../storage/browserCache';

export interface BackendLoginResponse {
  auth_token: string;
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  expires_at?: string;
}

const throwBackendError = async (res: Response): Promise<never> => {
  const err = new Error(await parseError(res));
  (err as any).statusCode = res.status;
  throw err;
};

const BACKEND_TIMEOUT_MS = (() => {
  const raw = Number((import.meta as any).env?.VITE_BACKEND_TIMEOUT_MS ?? 135_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 135_000;
})();

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = BACKEND_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as any)?.name === 'AbortError') {
      const timeoutErr = new Error(`Request timed out after ${timeoutMs}ms`);
      (timeoutErr as any).statusCode = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const hevyBackendValidateAuthToken = async (authToken: string): Promise<boolean> => {
  let res: Response;
  try {
    res = await fetchWithTimeout(buildBackendUrl('/api/hevy/validate'), {
      method: 'POST',
      headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ auth_token: authToken }),
    });
  } catch (err) {
    console.error('Hevy auth token validation failed: network error', err);
    return false;
  }

  if (!res.ok) {
    const msg = await parseError(res);
    console.error('Hevy auth token validation failed:', msg);
    return false;
  }

  const data = (await res.json()) as { valid: boolean };
  return data.valid === true;
};


export const hevyBackendValidateProApiKey = async (apiKey: string): Promise<boolean> => {
  const url = buildBackendUrl('/api/hevy/api-key/validate');
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    const msg = await parseError(res);
    console.error('Hevy Pro API key validation failed:', { url, status: res.status, msg });
    if (res.status === 404) {
      throw new Error(
        'Backend returned 404 for Hevy Pro API key validation. Check that VITE_BACKEND_URL is correct (no trailing /api) and that your backend has been redeployed to the latest version.'
      );
    }
    return false;
  }

  const data = (await res.json()) as { valid: boolean };
  return data.valid === true;
};

export const hevyBackendGetSetsWithProApiKey = async <TSet>(apiKey: string): Promise<BackendSetsResponse<TSet>> => {
  const cacheKey = browserCache.getCacheKey('hevyPro', apiKey);
  const cached = browserCache.getCached<BackendSetsResponse<TSet>>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = buildBackendUrl('/api/hevy/api-key/sets');
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    const msg = await parseError(res);
    console.error('Hevy Pro API key sets fetch failed:', { url, status: res.status, msg });
    if (res.status === 404) {
      throw new Error(
        'Backend returned 404 for Hevy Pro API key sync. Check that VITE_BACKEND_URL is correct (no trailing /api) and that your backend has been redeployed to the latest version.'
      );
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as BackendSetsResponse<TSet>;
  browserCache.setCache(cacheKey, data);
  return data;
};

export const hevyBackendLogin = async (emailOrUsername: string, password: string): Promise<BackendLoginResponse> => {
  const cacheKey = browserCache.getCacheKey('hevyLogin', emailOrUsername.toLowerCase());
  browserCache.clearCache('hevyLogin', emailOrUsername.toLowerCase());
  
  const res = await fetchWithTimeout(buildBackendUrl('/api/hevy/login'), {
    method: 'POST',
    headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ emailOrUsername, password }),
  });

  if (!res.ok) return throwBackendError(res);
  const data = (await res.json()) as BackendLoginResponse;
  
  if (data.auth_token) {
    browserCache.setCache(cacheKey, data);
  }
  
  return data;
};

export const hevyBackendWarmupSession = async (
  emailOrUsername: string,
  timeoutMs: number = 20_000
): Promise<boolean> => {
  const res = await fetchWithTimeout(
    buildBackendUrl('/api/hevy/recaptcha/session-warmup'),
    {
      method: 'POST',
      headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ emailOrUsername }),
    },
    timeoutMs
  );

  if (!res.ok) return false;
  const json = (await res.json()) as { warmed?: boolean };
  return Boolean(json.warmed);
};

export const hevyBackendRefresh = async (
  authToken: string | null,
  refreshToken: string,
  emailOrUsername?: string | null
): Promise<BackendLoginResponse> => {
  const cacheKey = browserCache.getCacheKey('hevyLogin', (emailOrUsername || 'unknown').toLowerCase());
  browserCache.clearCache('hevyLogin', (emailOrUsername || 'unknown').toLowerCase());
  
  const res = await fetchWithTimeout(buildBackendUrl('/api/hevy/refresh'), {
    method: 'POST',
    headers: mergeAnalyticsHeaders({
      'content-type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    }),
    body: JSON.stringify({
      auth_token: authToken || undefined,
      refresh_token: refreshToken,
      emailOrUsername: emailOrUsername?.trim() || undefined,
    }),
  });

  if (!res.ok) return throwBackendError(res);
  const data = (await res.json()) as BackendLoginResponse;
  
  if (data.auth_token) {
    browserCache.setCache(cacheKey, data);
  }
  
  return data;
};

export const hevyBackendGetAccount = async (authToken: string): Promise<{ username: string }> => {
  const cacheKey = browserCache.getCacheKey('hevyAccount', authToken);
  const cached = browserCache.getCached<{ username: string }>(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetchWithTimeout(buildBackendUrl('/api/hevy/account'), {
    method: 'GET',
    headers: {
      ...mergeAnalyticsHeaders({
        'content-type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      }),
    },
  });

  if (!res.ok) return throwBackendError(res);
  const json = (await res.json()) as { username?: string };
  if (!json.username) throw new Error('Failed to read Hevy username from backend.');
  
  const data = { username: json.username };
  browserCache.setCache(cacheKey, data);
  return data;
};

export const hevyBackendGetSets = async <TSet>(authToken: string, username: string): Promise<BackendSetsResponse<TSet>> => {
  const cacheKey = browserCache.getCacheKey('hevySets', username);
  const cached = browserCache.getCached<BackendSetsResponse<TSet>>(cacheKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({ username });
  const res = await fetchWithTimeout(buildBackendUrl(`/api/hevy/sets?${params.toString()}`), {
    method: 'GET',
    headers: {
      ...mergeAnalyticsHeaders({
        'content-type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      }),
    },
  });

  if (!res.ok) return throwBackendError(res);
  const data = (await res.json()) as BackendSetsResponse<TSet>;
  browserCache.setCache(cacheKey, data);
  return data;
};
