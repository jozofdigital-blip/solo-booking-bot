import { useState, useCallback, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<any>>();

export function useCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 30000 // 30 seconds
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (force = false) => {
    const cached = globalCache.get(key);
    
    if (!force && cached && Date.now() - cached.timestamp < ttl) {
      setData(cached.data);
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      globalCache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl]);

  const invalidate = useCallback(() => {
    globalCache.delete(key);
  }, [key]);

  const invalidateAll = useCallback(() => {
    globalCache.clear();
  }, []);

  return { data, loading, error, fetchData, invalidate, invalidateAll };
}
