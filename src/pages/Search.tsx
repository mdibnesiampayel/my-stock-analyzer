import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useApi } from "../lib/hooks";
import { usePagedNews } from "../lib/usePagedNews";
import type { Quote, SearchHit } from "../types";
import { NewsCard } from "../components/NewsCard";
import { MarketRow } from "../components/MarketRow";
import { ErrorBox, Skeleton } from "../components/ui";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const search = useApi<{ quotes: SearchHit[] }>(q ? `/api/search?q=${encodeURIComponent(q)}` : null);
  const symbols = (search.data?.quotes || []).map((h) => h.symbol).slice(0, 16);
  const quotes = useApi<{ quotes: Quote[] }>(symbols.length ? `/api/quotes?symbols=${symbols.join(",")}` : null);
  const feed = usePagedNews(q ? `search-news:${q}` : "search-news:empty", (offset) =>
    q ? `/api/news?q=${encodeURIComponent(q)}&offset=${offset}&limit=10` : null
  );

  const rows = useMemo(() => {
    const by = new Map((quotes.data?.quotes || []).map((x) => [x.symbol.toUpperCase(), x]));
    return (search.data?.quotes || []).map((h) => {
      const qte = by.get(h.symbol.toUpperCase());
      return {
        symbol: h.symbol,
        name: h.longName || h.name,
        longName: h.longName,
        price: qte?.price ?? null,
        change: qte?.change ?? null,
        changePercent: qte?.changePercent ?? null,
        volume: qte?.volume ?? null,
        logo: h.logo || qte?.logo,
        exchange: h.exchange || qte?.exchange,
      } as Quote;
    });
  }, [search.data, quotes.data]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && feed.hasMore && !feed.loading && !feed.error) {
          void feed.loadMore(false);
        }
      },
      { rootMargin: "720px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasMore, feed.loading, feed.error, feed.loadMore, feed.items.length]);

  if (!q) {
    return (
      <div className="space-y-3">
        <h1 className="text-[26px] font-semibold tracking-tight">Search results</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Type a company, ticker, or topic in the header search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Search results
        </div>
        <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight">“{q}”</h1>
      </div>

      {search.error && <ErrorBox message={search.error} onRetry={search.reload} />}

      <section>
        <h2 className="mb-2 text-[16px] font-semibold">Related stocks</h2>
        <div className="card overflow-hidden px-2">
          {search.loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="my-2 h-14" />)}
          {!search.loading && rows.length === 0 && (
            <div className="px-2 py-6 text-sm" style={{ color: "var(--muted)" }}>
              No matching stocks. Related news is still shown below.
            </div>
          )}
          {rows.map((row) => (
            <MarketRow key={row.symbol} quote={row} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[16px] font-semibold">News</h2>
        {feed.items.map((n) => (
          <NewsCard key={`${n.id}-${n.link}`} item={n} />
        ))}
        {feed.loading && Array.from({ length: feed.items.length ? 2 : 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        {feed.error && feed.items.length === 0 && (
          <ErrorBox message="Unable to load news right now." onRetry={() => void feed.loadMore(true)} />
        )}
        {feed.error && feed.items.length > 0 && (
          <div className="card flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>Couldn&apos;t load more news.</span>
            <button
              type="button"
              onClick={() => void feed.loadMore(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: "var(--ink)" }}
            >
              Try Again
            </button>
          </div>
        )}
        {!feed.loading && !feed.error && feed.items.length === 0 && (
          <div className="card px-4 py-5 text-sm" style={{ color: "var(--muted)" }}>
            No related news for this search.
          </div>
        )}
        <div ref={sentinel} className="h-10" />
      </section>
    </div>
  );
}
