import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const json = await api<T>(path);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

export function useDebounced<T>(value: T, delay = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
