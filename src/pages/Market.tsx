import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import type { Quote } from "../types";
import { ErrorBox, Skeleton } from "../components/ui";
import { cycleSort, MarketHead, MarketRow, type SortKey, type SortState } from "../components/MarketRow";
import { marketLabel } from "../lib/format";

const PAGE = 40;

export default function Market() {
  const overview = useApi<{ indices: Quote[] }>("/api/market/overview");
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });
  const [rows, setRows] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const inflightRef = useRef(false);
  const hasMoreRef = useRef(true);
  const rowsRef = useRef<Quote[]>([]);
  const acRef = useRef<AbortController | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  const load = useCallback(async (reset: boolean) => {
    if (!reset && inflightRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    const off = reset ? 0 : offsetRef.current;
    const s = sortRef.current;
    const qs = new URLSearchParams({ offset: String(off), limit: String(PAGE) });
    if (s.key) {
      qs.set("sort", s.key);
      qs.set("dir", s.dir);
    }
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    inflightRef.current = true;
    setLoading(true);
    if (reset) setError(null);
    try {
      const d = await api<{ quotes: Quote[]; total: number; hasMore: boolean }>(`/api/market/us?${qs}`, {
        signal: ac.signal,
      });
      const incoming = d.quotes || [];
      const next = reset ? incoming : [...rowsRef.current, ...incoming];
      rowsRef.current = next;
      offsetRef.current = off + incoming.length;
      const more = Boolean(d.hasMore) && incoming.length > 0;
      hasMoreRef.current = more;
      setRows(next);
      setTotal(d.total || next.length);
      setHasMore(more);
      setError(null);
    } catch (err) {
      if ((err instanceof DOMException || err instanceof Error) && (err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not load US stocks");
    } finally {
      if (acRef.current === ac) {
        inflightRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    rowsRef.current = [];
    offsetRef.current = 0;
    hasMoreRef.current = true;
    inflightRef.current = false;
    setRows([]);
    setHasMore(true);
    void load(true);
    return () => acRef.current?.abort();
  }, [sort.key, sort.dir, load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void load(false);
      },
      { rootMargin: "480px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load, rows.length, hasMore]);

  const onSort = (key: SortKey) => setSort((prev) => cycleSort(prev, key));

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Market</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {marketLabel(overview.data?.indices?.[0]?.marketState)}
          {total ? ` · ${total.toLocaleString("en-US")} US stocks` : ""}
        </p>
      </div>

      {error && <ErrorBox message={error} onRetry={() => load(true)} />}

      <div className="card overflow-hidden px-2 pt-3">
        <MarketHead sort={sort} onSort={onSort} />
        {loading && rows.length === 0 && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="my-2 h-14" />)}
        {rows.map((q) => (
          <MarketRow key={q.symbol} quote={q} />
        ))}
        <div ref={sentinel} className="h-4" />
        {loading && rows.length > 0 && <Skeleton className="my-2 h-14" />}
        {!loading && !rows.length && !error && (
          <div className="px-2 py-6 text-sm" style={{ color: "var(--muted)" }}>
            No US stocks available right now.
          </div>
        )}
      </div>

      {hasMore && !loading && (
        <button
          type="button"
          onClick={() => load(false)}
          className="w-full rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          Show more stocks
        </button>
      )}
    </div>
  );
}
