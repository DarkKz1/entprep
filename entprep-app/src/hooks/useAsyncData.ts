import { useState, useEffect } from 'react';
import type { AsyncDataState } from '../types/index';

export function useAsyncData<T>(asyncFn: () => Promise<T>, deps: React.DependencyList = []): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    asyncFn()
      .then(result => {
        if (!cancelled) { setData(result); setLoading(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}
