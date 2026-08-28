import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useApi } from "../lib/hooks";
import { useStore } from "../lib/store";
import type { Analysis, Candle, Fundamentals, Metrics, NewsItem, Quote } from "../types";
import { formatCompact, formatPct, formatPrice, formatRatio, formatVolume, marketLabel } from "../lib/format";
import { Avatar, ChangeBadge, ErrorBox, RatingDot, ScoreRing, Skeleton, YearBars } from "../components/ui";
import { StarButton } from "../components/StarButton";
import { FollowButton } from "../components/FollowButton";
import { CandleChart } from "../components/CandleChart";
import { NewsCard } from "../components/NewsCard";
import { StockCard } from "../components/StockCard";

const TABS = ["Overview", "Fundamentals", "Analysis", "Competitors", "News"] as const;
type Tab = (typeof TABS)[number];

const NEWS_FILTERS = [
  { id: "all", label: "All" },
  { id: "earnings", label: "Earnings" },
  { id: "products", label: "Products" },
  { id: "technology", label: "Technology" },
  { id: "management", label: "Management" },
  { id: "regulation", label: "Regulation" },
  { id: "analyst", label: "Analyst" },
  { id: "ma", label: "M&A" },
  { id: "partnerships", label: "Partnerships" },
];

interface StockPayload {
  quote: Quote;
  profile: {
    symbol: string;
    name: string;
    exchange?: string;
    sector?: string;
    industry?: string;
    about?: string | null;
    headquarters?: string | null;
    logo?: string;
    cik?: string | null;
  };
  insights: {
    valuation?: { description?: string; discount?: string; relativeValue?: string };
    recommendation?: { targetPrice?: number; rating?: string; provider?: string };
    technicals?: { shortTerm?: string; midTerm?: string; longTerm?: string };
    snapshot?: { sectorInfo?: string };
  } | null;
  fundamentals: Fundamentals | null;
  metrics: Metrics;
  marketState?: string;
}

export default function Stock() {
  const { symbol = "" } = useParams();
  const sym = symbol.toUpperCase();
  const { addRecent } = useStore();
  const [tab, setTab] = useState<Tab>("Overview");
  const [range, setRange] = useState("1M");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [newsCat, setNewsCat] = useState("all");
  const [newsOffset, setNewsOffset] = useState(0);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    addRecent(sym);
    setTab("Overview");
    setNewsCat("all");
    setNewsOffset(0);
    setNewsItems([]);
  }, [sym, addRecent]);

  const stock = useApi<StockPayload>(`/api/stock/${encodeURIComponent(sym)}`);
  const chart = useApi<{ candles: Candle[]; quote: Quote }>(`/api/chart/${encodeURIComponent(sym)}?range=${range}`);
  const analysis = useApi<{ analysis: Analysis }>(tab === "Analysis" || tab === "Fundamentals" ? `/api/stock/${encodeURIComponent(sym)}/analysis` : null);
  const peers = useApi<{ peers: Quote[] }>(tab === "Competitors" ? `/api/stock/${encodeURIComponent(sym)}/peers` : null);
  const news = useApi<{ items: NewsItem[]; hasMore: boolean }>(
    tab === "News" ? `/api/stock/${encodeURIComponent(sym)}/news?category=${newsCat}&offset=${newsOffset}&limit=20` : null
  );

  useEffect(() => {
    if (tab !== "News" || !news.data) return;
    setNewsItems((prev) => (newsOffset === 0 ? news.data!.items : [...prev, ...news.data!.items]));
  }, [news.data, newsOffset, tab]);

  const q = stock.data?.quote;
  const p = stock.data?.profile;
  const m = stock.data?.metrics;

  if (stock.error) {
    return (
      <div className="space-y-4">
        <Back />
        <ErrorBox message={stock.error} onRetry={stock.reload} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Back />
        {p && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{p.name}</div>
            <div className="text-[12px]" style={{ color: "var(--muted)" }}>
              {sym} · {p.exchange || "US"}
            </div>
          </div>
        )}
        <StarButton symbol={sym} />
      </div>

      {stock.loading || !q ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <Avatar symbol={sym} logo={p?.logo} size={48} />
            <div className="min-w-0 flex-1">
              <div className="price text-[34px] font-semibold leading-none tracking-tight">{formatPrice(q.price)}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ChangeBadge value={q.changePercent} />
                <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                  {formatPrice(q.change)} today · {marketLabel(q.marketState)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <StarButton symbol={sym} withLabel />
            <FollowButton symbol={sym} />
            <button
              type="button"
              onClick={() => setTab("Analysis")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              <Sparkles size={15} />
              Analyze
            </button>
          </div>

          <div className="card p-3">
            {chart.loading && <Skeleton className="h-[260px] w-full" />}
            {chart.data && <CandleChart candles={chart.data.candles} range={range} onRange={setRange} />}
          </div>

          <div className="hide-scroll -mx-1 flex gap-1 overflow-x-auto px-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold"
                style={
                  tab === t
                    ? { background: "var(--ink)", color: "var(--bg)" }
                    : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--line)" }
                }
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Overview" && p && m && (
            <Overview p={p} q={q} m={m} insights={stock.data?.insights ?? null} aboutOpen={aboutOpen} setAboutOpen={setAboutOpen} onAnalyze={() => setTab("Analysis")} />
          )}
          {tab === "Fundamentals" && (
            <FundamentalsTab
              f={stock.data?.fundamentals}
              m={m}
              analysis={analysis.data?.analysis}
              openItem={openItem}
              setOpenItem={setOpenItem}
            />
          )}
          {tab === "Analysis" && (
            <AnalysisTab analysis={analysis.data?.analysis} loading={analysis.loading} error={analysis.error} onRetry={analysis.reload} />
          )}
          {tab === "Competitors" && (
            <PeersTab peers={peers.data?.peers || []} loading={peers.loading} symbol={sym} metrics={m} />
          )}
          {tab === "News" && (
            <NewsTab
              items={newsItems}
              category={newsCat}
              setCategory={(c) => {
                setNewsCat(c);
                setNewsOffset(0);
                setNewsItems([]);
              }}
              loading={news.loading}
              hasMore={news.data?.hasMore}
              onMore={() => setNewsOffset((o) => o + 20)}
            />
          )}
        </>
      )}
    </div>
  );
}

function Back() {
  return (
    <Link to="/" className="inline-flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--line)" }} aria-label="Back">
      <ArrowLeft size={18} />
    </Link>
  );
}

function Overview({
  p,
  q,
  m,
  insights,
  aboutOpen,
  setAboutOpen,
  onAnalyze,
}: {
  p: StockPayload["profile"];
  q: Quote;
  m: Metrics;
  insights: StockPayload["insights"];
  aboutOpen: boolean;
  setAboutOpen: (v: boolean) => void;
  onAnalyze: () => void;
}) {
  const about = p.about || "No company description is available yet.";
  const shown = aboutOpen ? about : about.length > 220 ? about.slice(0, 220).replace(/\s+\S*$/, "") + "…" : about;
  return (
    <div className="space-y-3">
      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          About
        </div>
        <p className="mt-2 text-[14px] leading-relaxed">{shown}</p>
        {about.length > 220 && (
          <button type="button" className="mt-2 text-[12px] font-semibold" onClick={() => setAboutOpen(!aboutOpen)}>
            {aboutOpen ? "Show less" : "Read more"}
          </button>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]" style={{ color: "var(--muted)" }}>
          <div>Sector · {p.sector || "—"}</div>
          <div>Industry · {p.industry || "—"}</div>
          {p.headquarters && <div className="col-span-2">HQ · {p.headquarters}</div>}
        </div>
      </section>

      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Key figures
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Market cap" value={formatCompact(m.marketCap)} />
          <Metric label="P/E" value={formatRatio(m.pe)} />
          <Metric label="EPS" value={m.eps != null ? m.eps.toFixed(2) : "—"} />
          <Metric label="Revenue" value={formatCompact(m.revenue)} />
          <Metric label="Net income" value={formatCompact(m.netIncome)} />
          <Metric label="Free cash flow" value={formatCompact(m.fcf)} />
          <Metric label="Cash" value={formatCompact(m.cash)} />
          <Metric label="Debt" value={formatCompact(m.debt)} />
          <Metric label="Volume" value={formatVolume(q.volume)} />
          <Metric label="52-week" value={`${formatPrice(q.fiftyTwoWeekLow)} – ${formatPrice(q.fiftyTwoWeekHigh)}`} />
        </div>
      </section>

      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Valuation
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Snapshot" value={m.valuationLabel || "n/a"} />
          <Metric label="Discount / premium" value={m.valuationDiscount || "—"} />
          <Metric label="Price / sales" value={formatRatio(m.ps)} />
          <Metric label="Price / book" value={formatRatio(m.pb)} />
          <Metric label="Analyst rating" value={m.recommendation || "—"} />
          <Metric label="Target" value={formatPrice(m.targetPrice)} />
        </div>
        {insights?.recommendation?.provider && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
            Research snapshot from {insights.recommendation.provider}. Not a recommendation from StockLens.
          </p>
        )}
      </section>

      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Earnings & dividends
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Latest EPS" value={m.eps != null ? m.eps.toFixed(2) : "—"} />
          <Metric label="EPS growth" value={formatPct((m.epsGrowth || 0) * 100, true)} />
          <Metric label="Dividend / share" value={m.dividendPerShare != null ? `$${m.dividendPerShare.toFixed(2)}` : "—"} />
          <Metric label="Dividend yield" value={formatPct((m.dividendYield || 0) * 100, false)} />
        </div>
      </section>

      <button type="button" onClick={onAnalyze} className="card flex w-full items-center justify-between p-4 text-left">
        <div>
          <div className="text-sm font-semibold">Run fundamental analysis</div>
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            8-question checklist and a score you can explain.
          </div>
        </div>
        <Sparkles size={18} />
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px]" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="price mt-0.5 text-[14px] font-semibold">{value}</div>
    </div>
  );
}

function FundamentalsTab({
  f,
  m,
  analysis,
  openItem,
  setOpenItem,
}: {
  f?: Fundamentals | null;
  m?: Metrics;
  analysis?: Analysis;
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Current fundamentals
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Revenue" value={formatCompact(m?.revenue)} />
          <Metric label="Net income" value={formatCompact(m?.netIncome)} />
          <Metric label="EPS" value={m?.eps != null ? m.eps.toFixed(2) : "—"} />
          <Metric label="Free cash flow" value={formatCompact(m?.fcf)} />
          <Metric label="Cash" value={formatCompact(m?.cash)} />
          <Metric label="Debt" value={formatCompact(m?.debt)} />
          <Metric label="Profit margin" value={formatPct((m?.profitMargin || 0) * 100, false)} />
          <Metric label="Revenue growth" value={formatPct((m?.revenueGrowth || 0) * 100, true)} />
        </div>
        {f?.asOf && (
          <div className="mt-3 text-[11px]" style={{ color: "var(--muted)" }}>
            Based on SEC filings as of {f.asOf}.
          </div>
        )}
      </section>

      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          5-year trends
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 text-xs font-medium">Revenue</div>
            <YearBars data={f?.revenue?.annual || []} />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium">Net income</div>
            <YearBars data={f?.netIncome?.annual || []} />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium">EPS</div>
            <YearBars data={f?.eps?.annual || []} />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium">Free cash flow</div>
            <YearBars data={f?.fcf?.annual || []} />
          </div>
        </div>
      </section>

      {analysis && (
        <Checklist items={analysis.items} score={analysis.score} openItem={openItem} setOpenItem={setOpenItem} />
      )}
    </div>
  );
}

function Checklist({
  items,
  score,
  openItem,
  setOpenItem,
}: {
  items: Analysis["items"];
  score: number;
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            Simple checklist
          </div>
          <div className="mt-1 text-[16px] font-semibold">Fundamental score: {score}/100</div>
        </div>
        <ScoreRing score={score} size={72} />
      </div>
      <div className="divide-y" style={{ borderColor: "var(--line)" }}>
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setOpenItem(openItem === it.id ? null : it.id)}
            className="block w-full px-4 py-3 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-5 text-[12px] font-bold" style={{ color: "var(--muted)" }}>
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13.5px] font-semibold leading-snug">{it.question}</div>
                  <RatingDot rating={it.rating} />
                </div>
                <div className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                  {it.headline}
                </div>
                {openItem === it.id && (
                  <p className="mt-2 text-[13px] leading-relaxed">
                    {it.reason}{" "}
                    <span style={{ color: "var(--muted)" }}>
                      ({it.points}/{it.max} points)
                    </span>
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function AnalysisTab({
  analysis,
  loading,
  error,
  onRetry,
}: {
  analysis?: Analysis;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [openItem, setOpenItem] = useState<string | null>(null);
  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (!analysis) return null;
  return (
    <div className="space-y-3">
      <section className="card flex items-center gap-4 p-4">
        <ScoreRing score={analysis.score} />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            AI fundamental analysis
          </div>
          <div className="mt-1 text-lg font-semibold">{analysis.label}</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            Score {analysis.score}/100
          </div>
        </div>
      </section>
      <section className="card p-4 text-[14px] leading-relaxed">{analysis.thesis}</section>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#1f8df9" }}>
            What looks good
          </div>
          <ul className="mt-2 space-y-2 text-[13px] leading-relaxed">
            {analysis.bull.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
        <section className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#dd7a2b" }}>
            What to watch
          </div>
          <ul className="mt-2 space-y-2 text-[13px] leading-relaxed">
            {analysis.bear.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      </div>
      <Checklist items={analysis.items} score={analysis.score} openItem={openItem} setOpenItem={setOpenItem} />
      <p className="px-1 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {analysis.disclaimer}
      </p>
    </div>
  );
}

function PeersTab({ peers, loading }: { peers: (Quote & { metrics?: Metrics })[]; loading: boolean; symbol: string; metrics?: Metrics }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!peers.length) return <div className="card p-4 text-sm">No close competitors were found in the current universe.</div>;
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {peers.map((p) => (
          <StockCard key={p.symbol} quote={p} />
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[12px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Chg</th>
              <th className="px-3 py-2 font-medium">P/E</th>
              <th className="px-3 py-2 font-medium">Rev gr.</th>
              <th className="px-3 py-2 font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <tr key={p.symbol} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-3 py-2 font-semibold">{p.symbol}</td>
                <td className="price px-3 py-2">{formatPrice(p.price)}</td>
                <td className="px-3 py-2">
                  <ChangeBadge value={p.changePercent} />
                </td>
                <td className="px-3 py-2">{formatRatio(p.metrics?.pe)}</td>
                <td className="px-3 py-2">{formatPct((p.metrics?.revenueGrowth || 0) * 100)}</td>
                <td className="px-3 py-2">{formatPct((p.metrics?.profitMargin || 0) * 100, false)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewsTab({
  items,
  category,
  setCategory,
  loading,
  hasMore,
  onMore,
}: {
  items: NewsItem[];
  category: string;
  setCategory: (c: string) => void;
  loading: boolean;
  hasMore?: boolean;
  onMore: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="hide-scroll flex gap-1 overflow-x-auto pb-1">
        {NEWS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCategory(f.id)}
            className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={
              category === f.id
                ? { background: "var(--ink)", color: "var(--bg)" }
                : { background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)" }
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((n) => (
          <NewsCard key={n.id} item={n} />
        ))}
        {loading && <Skeleton className="h-24" />}
        {!loading && items.length === 0 && <div className="card p-4 text-sm">No stories in this filter yet.</div>}
      </div>
      {hasMore && (
        <button type="button" onClick={onMore} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          Load older news
        </button>
      )}
    </div>
  );
}
