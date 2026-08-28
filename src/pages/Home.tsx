import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Star, Sparkle, TrendingUp, TrendingDown } from "lucide-react";
import { SearchBar } from "../components/SearchOverlay";
import { StockCard, StockCardSkeleton } from "../components/StockCard";
import { NewsCard } from "../components/NewsCard";
import { ChangeBadge, EmptyState, ErrorBox, PrimaryButton, SectionLabel } from "../components/ui";
import { useApi } from "../lib/hooks";
import { useStore } from "../lib/store";
import { formatIndex, marketLabel } from "../lib/format";
import type { NewsItem, Quote } from "../types";

const TABS = [
  { id: "favourite", label: "Favourite", icon: Star },
  { id: "hot", label: "Hot", icon: Flame },
  { id: "new", label: "New", icon: Sparkle },
  { id: "gainers", label: "Gainers", icon: TrendingUp },
  { id: "losers", label: "Losers", icon: TrendingDown },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home({ onSearch }: { onSearch: () => void }) {
  const [tab, setTab] = useState<TabId>("hot");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { favourites, follows } = useStore();

  const overview = useApi<{ indices: Quote[] }>("/api/market/overview");
  const lists = useApi<{ hot: Quote[]; gainers: Quote[]; losers: Quote[]; new: Quote[] }>("/api/market/lists");
  const favQuery = favourites.length ? `/api/quotes?symbols=${favourites.join(",")}` : null;
  const favs = useApi<{ quotes: Quote[] }>(favQuery);
  const newsPath = follows.length ? `/api/news?symbols=${follows.join(",")}&limit=10` : "/api/news?limit=10";
  const news = useApi<{ items: NewsItem[]; personalized: boolean }>(newsPath);

  const showMore = expanded[tab] === true;
  const visible = (arr: Quote[]) => (showMore ? arr.slice(0, 10) : arr.slice(0, 5));

  const list = useMemo(() => {
    if (tab === "favourite") return favs.data?.quotes || [];
    if (tab === "hot") return lists.data?.hot || [];
    if (tab === "new") return lists.data?.new || [];
    if (tab === "gainers") return lists.data?.gainers || [];
    return lists.data?.losers || [];
  }, [tab, lists.data, favs.data]);

  const loading = tab === "favourite" ? Boolean(favourites.length && favs.loading) : lists.loading;
  const error = tab === "favourite" ? favs.error : lists.error;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
          {marketLabel(overview.data?.indices?.[0]?.marketState)}
        </div>
        <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight">Research, simply.</h1>
      </div>

      <div className="lg:hidden">
        <SearchBar onOpen={onSearch} />
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {(overview.data?.indices || []).slice(0, 4).map((ix) => (
          <div key={ix.symbol} className="card px-3 py-2.5">
            <div className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
              {ix.name}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="price text-sm font-semibold">{formatIndex(ix.price)}</div>
              <ChangeBadge value={ix.changePercent} />
            </div>
          </div>
        ))}
        {overview.loading &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel h-[62px] rounded-2xl" />)}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div>
          <div className="hide-scroll -mx-1 flex gap-1 overflow-x-auto px-1 pb-2 touch-pan-x">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold"
                  style={
                    active
                      ? { background: "var(--ink)", color: "var(--bg)" }
                      : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--line)" }
                  }
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "hot" && (
            <div className="mb-3 text-[12px]" style={{ color: "var(--muted)" }}>
              Ranked by a mix of price movement, trading volume, and market activity — not just the biggest gainers.
            </div>
          )}
          {tab === "new" && (
            <div className="mb-3 text-[12px]" style={{ color: "var(--muted)" }}>
              Newly listed or recently priced IPOs in the supported US market universe.
            </div>
          )}

          {error && <ErrorBox message={error} onRetry={tab === "favourite" ? favs.reload : lists.reload} />}

          {tab === "favourite" && !favourites.length && (
            <EmptyState
              title="You haven't added any favourite stocks yet."
              body="Star a company to keep it on this list. Favourites stay on this device."
              action={<PrimaryButton onClick={onSearch}>Search for a stock</PrimaryButton>}
            />
          )}

          <div className="space-y-2">
            {loading && Array.from({ length: 5 }).map((_, i) => <StockCardSkeleton key={i} />)}
            {!loading &&
              visible(list).map((q, i) => (
                <StockCard
                  key={q.symbol}
                  quote={q}
                  rank={tab === "favourite" ? undefined : i + 1}
                  extra={tab === "new" ? q.listingDate : tab === "hot" ? q.rankReason : undefined}
                />
              ))}
          </div>

          {!loading && list.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((p) => ({ ...p, [tab]: !showMore }))}
              className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              {showMore ? "Show Less" : "Show More"}
            </button>
          )}
        </div>

        <div className="mt-6 lg:mt-0">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel>{news.data?.personalized ? "From stocks you follow" : "Latest news"}</SectionLabel>
            <Link to="/news" className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {news.loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skel h-28 rounded-2xl" />)}
            {(news.data?.items || []).slice(0, 10).map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
