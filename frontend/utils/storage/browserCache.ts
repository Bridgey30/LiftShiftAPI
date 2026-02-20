const BROWSER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const getCacheKey = (prefix: string, id: string): string => `liftshift:cache:${prefix}:${id}`;

const getCached = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    
    if (age > BROWSER_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
};

const setCache = <T>(key: string, data: T): void => {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable - ignore
  }
};

const clearCache = (prefix: string, id: string): void => {
  const key = getCacheKey(prefix, id);
  localStorage.removeItem(key);
};

const clearAllCache = (): void => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('liftshift:cache:')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

export const browserCache = {
  getCached,
  setCache,
  clearCache,
  clearAllCache,
  getCacheKey,
  BROWSER_CACHE_TTL_MS,
};

export const clearUserCache = (): void => {
  browserCache.clearAllCache();
};
