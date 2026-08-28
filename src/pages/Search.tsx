import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "../lib/hooks";
import type { NewsItem, Quote, SearchHit } from "../types";
import { NewsCard } from "../components/NewsCard";
import { MarketRow } from "../components/MarketRow";
import { ErrorBox, Skeleton } from "../components/ui";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const search = useApi<{ quotes: SearchHit[]; news: NewsItem[] }>(q ? `/api/search?q=${encodeURIComponent(q)}` : null);
  const symbols = (search.data?.quotes || []).map((h) => h.symbol).slice(0, 12);
  const quotes = useApi<{ quotes: Quote[] }>(symbols.length ? `/api/quotes?symbols=${symbols.join(",")}` : null);

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

  const news = search.data?.news || [];

  if (!q) {
    return (
      <div className="space-y-3">
        <h1 className="text-[26px] font-semibold tracking-tight">Search</h1>
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
        <h2 className="mb-2 text-[16px] font-semibold">Stocks</h2>
        <div className="card overflow-hidden px-2">
          {search.loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="my-2 h-14" />)}
          {!search.loading && rows.length === 0 && (
            <div className="px-2 py-6 text-sm" style={{ color: "var(--muted)" }}>
              No matching stocks. Try a ticker or company name.
            </div>
          )}
          {rows.map((row) => (
            <MarketRow key={row.symbol} quote={row} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">News</h2>
          <Link to="/news" className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
            See all
          </Link>
        </div>
        <div className="space-y-2">
          {search.loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          {news.map((n) => (
            <NewsCard key={`${n.id}-${n.link}`} item={n} />
          ))}
          {!search.loading && news.length === 0 && (
            <div className="card px-4 py-5 text-sm" style={{ color: "var(--muted)" }}>
              No related news for this search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
