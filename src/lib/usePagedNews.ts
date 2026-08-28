import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { NewsItem } from "../types";

function newsKey(n: NewsItem) {
  const title = (n.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
  return `${n.id || ""}|${n.link || ""}|${title}|${n.publishedAt || ""}`;
}

export function dedupNews(items: NewsItem[]) {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const n of items) {
    if (!n?.title) continue;
    const k = newsKey(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

function isAbort(err: unknown) {
  return (err instanceof DOMException || err instanceof Error) && (err as Error).name === "AbortError";
}

export function usePagedNews(feedKey: string, buildUrl: (offset: number) => string | null) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const itemsRef = useRef<NewsItem[]>([]);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const inflightRef = useRef(false);
  const buildUrlRef = useRef(buildUrl);
  const acRef = useRef<AbortController | null>(null);
  buildUrlRef.current = buildUrl;

  const loadMore = useCallback(async (reset = false) => {
    if (!reset && inflightRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    const off = reset ? 0 : offsetRef.current;
    const url = buildUrlRef.current(off);
    if (!url) {
      setLoading(false);
      setHasMore(false);
      hasMoreRef.current = false;
      return;
    }
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    inflightRef.current = true;
    setLoading(true);
    if (reset) setError(null);
    try {
      const d = await api<{ items: NewsItem[]; hasMore: boolean }>(url, { signal: ac.signal });
      const incoming = d.items || [];
      const merged = dedupNews(reset ? incoming : [...itemsRef.current, ...incoming]);
      itemsRef.current = merged;
      offsetRef.current = off + incoming.length;
      const more = Boolean(d.hasMore) && incoming.length > 0;
      hasMoreRef.current = more;
      setItems(merged);
      setHasMore(more);
      setError(null);
    } catch (err) {
      if (isAbort(err)) return;
      setError(err instanceof Error ? err.message : "Couldn't load more news.");
    } finally {
      if (acRef.current === ac) {
        inflightRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    itemsRef.current = [];
    offsetRef.current = 0;
    hasMoreRef.current = true;
    inflightRef.current = false;
    setItems([]);
    setHasMore(true);
    setError(null);
    void loadMore(true);
    return () => acRef.current?.abort();
  }, [feedKey, loadMore]);

  return { items, loading, error, hasMore, loadMore };
}
