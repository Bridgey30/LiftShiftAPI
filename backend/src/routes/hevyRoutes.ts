import express from 'express';
import { hevyGetAccount, hevyGetWorkoutsPaged, hevyLogin, hevyRefreshToken, hevyValidateAuthToken } from '../hevyApi';
import { warmRecaptchaSession } from '../hevyRecaptcha';
import { mapHevyWorkoutsToWorkoutSets } from '../mapToWorkoutSets';
import { getClientIP, getCountryFromIP } from '../geoLocation';

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const createHevyRouter = (opts: {
  loginLimiter: express.RequestHandler;
  requireAuthTokenHeader: (req: express.Request) => string;
  getCachedResponse: <T>(key: string, compute: () => Promise<T>) => Promise<T>;
}) => {
  const { loginLimiter, requireAuthTokenHeader, getCachedResponse } = opts;
  const router = express.Router();

  router.post('/login', loginLimiter, async (req, res) => {
    const startedAt = Date.now();
    const emailOrUsername = String(req.body?.emailOrUsername ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!emailOrUsername || !password) {
      console.log(`👤 ${emailOrUsername || 'unknown'} ❌ Missing credentials`);
      return res.status(400).json({ error: 'Missing emailOrUsername or password' });
    }

    try {
      const data = await hevyLogin(emailOrUsername, password);
      const loginDurationMs = Date.now() - startedAt;
      
      res.json({
        auth_token: data.auth_token,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user_id,
        expires_at: data.expires_at,
        _timing: { loginMs: loginDurationMs }
      });

      void (async () => {
        try {
          const account = await hevyGetAccount(data.auth_token);
          const profileUrl = `https://hevy.com/user/${account.username}`;
          const displayEmail = emailOrUsername?.includes('@') ? emailOrUsername : (account.email || '');
          const apiCountryCode = await getCountryFromIP(getClientIP(req));
          const countryInfo = apiCountryCode ? `[${apiCountryCode}] ` : '';
          console.log(`👤 ${account.full_name || account.username} (${displayEmail}) ${countryInfo}| ${profileUrl} ✅ Login OK (${formatDuration(loginDurationMs)})`);
        } catch {
          // Silent fail
        }
      })();
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Login failed';
      const loginDurationMs = Date.now() - startedAt;
      console.error(`👤 ${emailOrUsername} ❌ Login failed: ${message} (${formatDuration(loginDurationMs)})`);
      if (status === 401) {
        return res.status(401).json({
          error: `${message}.`,
        });
      }
      res.status(status).json({ error: message });
    }
  });

  router.post('/recaptcha/session-warmup', async (req, res) => {
    const warmupStartedAt = Date.now();
    const emailOrUsername = String(req.body?.emailOrUsername ?? '').trim();
    
    if (!emailOrUsername) {
      return res.status(400).json({ error: 'Missing emailOrUsername' });
    }

    try {
      await warmRecaptchaSession();
      const warmupDurationMs = Date.now() - warmupStartedAt;
      console.log(`👤 ${emailOrUsername} 🔥 Warmup OK (${formatDuration(warmupDurationMs)})`);
      res.json({ warmed: true });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Session warmup failed';
      console.error(`👤 ${emailOrUsername} ❌ Warmup failed: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  router.post('/validate', async (req, res) => {
    const authToken = String(req.body?.auth_token ?? '').trim();
    if (!authToken) return res.status(400).json({ error: 'Missing auth_token' });

    try {
      const valid = await hevyValidateAuthToken(authToken);
      res.json({ valid });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      res.status(status).json({ error: (err as Error).message || 'Validate failed' });
    }
  });

  router.post('/refresh', async (req, res) => {
    const startedAt = Date.now();
    const refreshToken = String(req.body?.refresh_token ?? '').trim();
    const emailOrUsername = String(req.body?.emailOrUsername ?? '').trim();
    const bodyAuthToken = String(req.body?.auth_token ?? '').trim();
    const authHeader = req.header('authorization');
    const matchedAuth = authHeader?.match(/^Bearer\s+(.+)$/i);
    const authToken = bodyAuthToken || (matchedAuth?.[1]?.trim() ?? '');

    if (!refreshToken) {
      console.log(`👤 ${emailOrUsername || 'unknown'} ❌ Missing refresh_token`);
      return res.status(400).json({ error: 'Missing refresh_token' });
    }

    try {
      const data = await hevyRefreshToken(refreshToken, authToken || undefined);
      const refreshDurationMs = Date.now() - startedAt;
      
      res.json({
        auth_token: data.auth_token,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user_id,
        expires_at: data.expires_at,
        _timing: { refreshMs: refreshDurationMs }
      });

      void (async () => {
        try {
          const account = await hevyGetAccount(data.auth_token);
          const profileUrl = `https://hevy.com/user/${account.username}`;
          const displayEmail = emailOrUsername?.includes('@') ? emailOrUsername : (account.email || '');
          const apiCountryCode = await getCountryFromIP(getClientIP(req));
          const countryInfo = apiCountryCode ? `[${apiCountryCode}] ` : '';
          console.log(`👤 ${account.full_name || account.username} (${displayEmail}) ${countryInfo}| ${profileUrl} ✅ Refresh OK (${formatDuration(refreshDurationMs)})`);
        } catch {
          // Silent fail
        }
      })();
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Refresh failed';
      const refreshDurationMs = Date.now() - startedAt;
      console.error(`👤 ${emailOrUsername || 'unknown'} ❌ Refresh failed: ${message} (${formatDuration(refreshDurationMs)})`);
      if (status === 401) {
        return res.status(401).json({ error: message });
      }
      res.status(status).json({ error: message });
    }
  });

  router.get('/account', async (req, res) => {
    try {
      const token = requireAuthTokenHeader(req);
      const data = await hevyGetAccount(token);
      res.json(data);
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      res.status(status).json({ error: (err as Error).message || 'Failed to fetch account' });
    }
  });

  router.get('/workouts', async (req, res) => {
    const username = String(req.query.username ?? '').trim();
    const offset = Number(req.query.offset ?? 0);

    if (!username) return res.status(400).json({ error: 'Missing username' });
    if (!Number.isFinite(offset) || offset < 0) return res.status(400).json({ error: 'Invalid offset' });

    try {
      const token = requireAuthTokenHeader(req);
      const data = await hevyGetWorkoutsPaged(token, { username, offset });
      res.json(data);
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      res.status(status).json({ error: (err as Error).message || 'Failed to fetch workouts' });
    }
  });

  router.get('/sets', async (req, res) => {
    const startedAt = Date.now();
    const username = String(req.query.username ?? '').trim();
    const maxPages = req.query.maxPages != null ? Number(req.query.maxPages) : undefined;

    if (!username) {
      return res.status(400).json({ error: 'Missing username' });
    }
    if (maxPages != null && (!Number.isFinite(maxPages) || maxPages <= 0)) {
      return res.status(400).json({ error: 'Invalid maxPages' });
    }

    try {
      const token = requireAuthTokenHeader(req);
      const cacheKey = `hevySets:${username}:${maxPages ?? 'all'}`;
      
      const { workouts, sets } = await getCachedResponse(cacheKey, async () => {
        const allWorkouts = [] as any[];
        let offset = 0;
        let page = 0;

        while (true) {
          if (maxPages != null && page >= maxPages) break;

          const data = await hevyGetWorkoutsPaged(token, { username, offset, limit: 10 });
          const workouts = data.workouts ?? [];
          
          if (workouts.length === 0) break;

          allWorkouts.push(...workouts);
          offset += 10;
          page += 1;
        }

        const sets = mapHevyWorkoutsToWorkoutSets(allWorkouts);
        return { workouts: allWorkouts, sets };
      });
      
      const setsDurationMs = Date.now() - startedAt;
      
      // Log with full user info
      void (async () => {
        try {
          const account = await hevyGetAccount(token);
          const profileUrl = `https://hevy.com/user/${account.username}`;
          const apiCountryCode = await getCountryFromIP(getClientIP(req));
          const countryInfo = apiCountryCode ? `[${apiCountryCode}] ` : '';
          console.log(`👤 ${account.full_name || account.username} ${countryInfo}| ${profileUrl} ✅ Sets OK: ${sets.length} sets (${formatDuration(setsDurationMs)})`);
        } catch {
          // Fallback
          console.log(`👤 ${username} ✅ Sets OK: ${sets.length} sets (${formatDuration(setsDurationMs)})`);
        }
      })();
      
      res.json({ sets, meta: { workouts: workouts.length }, _timing: { setsMs: setsDurationMs } });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Failed to fetch sets';
      console.error(`👤 ${username} ❌ Sets failed: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  return router;
};
