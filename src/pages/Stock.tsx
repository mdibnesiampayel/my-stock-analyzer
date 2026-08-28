import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { usePagedNews } from "../lib/usePagedNews";
import type { Analysis, Candle, Fundamentals, Metrics, Quote } from "../types";
import { formatPct, formatRatio, formatVolume, marketLabel } from "../lib/format";
import { useMoney } from "../lib/money";
import { Avatar, ChangeBadge, ErrorBox, RatingDot, ScoreRing, Skeleton, YearBars } from "../components/ui";
import { StarButton } from "../components/StarButton";
import { FollowButton } from "../components/FollowButton";
import { CandleChart } from "../components/CandleChart";
import { NewsCard } from "../components/NewsCard";
import { StockCard } from "../components/StockCard";

const TABS = ["Overview", "Fundamentals", "AI Analysis", "Competitors", "News"] as const;
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
  const { activeAiKey } = useStore();
  const money = useMoney();
  const [tab, setTab] = useState<Tab>("Overview");
  const [range, setRange] = useState("1M");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [newsCat, setNewsCat] = useState("all");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    setTab("Overview");
    setNewsCat("all");
    setAboutOpen(false);
    setOpenItem(null);
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(false);
    setRange("1M");
    // Only reset when the ticker changes — not when store callbacks refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sym]);

  const stock = useApi<StockPayload>(`/api/stock/${encodeURIComponent(sym)}`);
  const chart = useApi<{ candles: Candle[]; quote: Quote }>(`/api/chart/${encodeURIComponent(sym)}?range=${range}`);
  const peers = useApi<{ peers: Quote[] }>(tab === "Competitors" ? `/api/stock/${encodeURIComponent(sym)}/peers` : null);

  const runAnalysis = async () => {
    if (analysisLoading) return;
    setTab("AI Analysis");
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const body: Record<string, string> = {};
      if (activeAiKey?.key) {
        body.provider = activeAiKey.provider;
        body.apiKey = activeAiKey.key;
        if (activeAiKey.model) body.model = activeAiKey.model;
        if (activeAiKey.baseUrl) body.baseUrl = activeAiKey.baseUrl;
      }
      const d = await api<{ analysis: Analysis }>(`/api/stock/${encodeURIComponent(sym)}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setAnalysis(d.analysis);
    } catch {
      setAnalysisError("Unable to complete the analysis right now.");
    } finally {
      setAnalysisLoading(false);
    }
  };

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
          <div className="min-w-0 flex-1 lg:hidden">
            <div className="truncate text-sm font-semibold">{p.name}</div>
            <div className="text-[12px]" style={{ color: "var(--muted)" }}>
              {sym} · {p.exchange || "US"}
            </div>
          </div>
        )}
        <div className="lg:hidden">
          <StarButton symbol={sym} />
        </div>
      </div>

      {stock.loading || !q ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar symbol={sym} logo={p?.logo} size={52} />
              <div className="min-w-0">
                <div className="hidden truncate text-xl font-semibold lg:block">{p?.name}</div>
                <div className="hidden text-sm lg:block" style={{ color: "var(--muted)" }}>
                  {sym} · {p?.exchange || "US"}
                </div>
                <div className="price text-[34px] font-semibold leading-none tracking-tight lg:mt-2">{money.price(q.price)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ChangeBadge value={q.changePercent} />
                  <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                    {money.price(q.change)} today · {marketLabel(q.marketState)}
                    {money.converted ? ` · ${money.code}` : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <StarButton symbol={sym} withLabel />
              <FollowButton symbol={sym} />
              <button
                type="button"
                onClick={() => void runAnalysis()}
                disabled={analysisLoading}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--ink)", color: "var(--bg)" }}
              >
                <Sparkles size={15} />
                {analysisLoading ? "Analyzing…" : "Analyze This Stock"}
              </button>
            </div>
          </div>

          <div className="card p-3">
            {chart.loading && <Skeleton className="h-[240px] w-full lg:h-[380px]" />}
            {chart.data && <CandleChart candles={chart.data.candles} range={range} onRange={setRange} />}
          </div>

          <div className="hide-scroll -mx-1 flex gap-1 overflow-x-auto px-1 touch-pan-x">
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
            <Overview p={p} q={q} m={m} insights={stock.data?.insights ?? null} aboutOpen={aboutOpen} setAboutOpen={setAboutOpen} onAnalyze={() => void runAnalysis()} />
          )}
          {tab === "Fundamentals" && (
            <FundamentalsTab f={stock.data?.fundamentals} m={m} analysis={analysis} openItem={openItem} setOpenItem={setOpenItem} />
          )}
          {tab === "AI Analysis" && (
            <AnalysisTab
              analysis={analysis}
              loading={analysisLoading}
              error={analysisError}
              onRetry={() => void runAnalysis()}
              onAnalyze={() => void runAnalysis()}
            />
          )}
          {tab === "Competitors" && (
            <PeersTab peers={peers.data?.peers || []} loading={peers.loading} />
          )}
          {tab === "News" && (
            <NewsTab symbol={sym} category={newsCat} setCategory={setNewsCat} />
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
  const money = useMoney();
  const about = p.about || "No company description is available yet.";
  const shown = aboutOpen ? about : about.length > 220 ? about.slice(0, 220).replace(/\s+\S*$/, "") + "…" : about;
  return (
    <div className="space-y-3">
      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          About
        </div>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed">{shown}</p>
        {about.length > 220 && (
          <button type="button" className="mt-2 text-[12px] font-semibold" onClick={() => setAboutOpen(!aboutOpen)}>
            {aboutOpen ? "Show less" : "Read more"}
          </button>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] lg:grid-cols-4" style={{ color: "var(--muted)" }}>
          <div>Sector · {p.sector || "—"}</div>
          <div>Industry · {p.industry || "—"}</div>
          {p.headquarters && <div className="col-span-2">HQ · {p.headquarters}</div>}
        </div>
      </section>

      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Key figures
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric label="Market cap" value={money.compact(m.marketCap)} />
          <Metric label="P/E" value={formatRatio(m.pe)} />
          <Metric label="EPS" value={money.price(m.eps)} />
          <Metric label="Revenue" value={money.compact(m.revenue)} />
          <Metric label="Net income" value={money.compact(m.netIncome)} />
          <Metric label="Free cash flow" value={money.compact(m.fcf)} />
          <Metric label="Cash" value={money.compact(m.cash)} />
          <Metric label="Debt" value={money.compact(m.debt)} />
          <Metric label="Volume" value={formatVolume(q.volume)} />
          <Metric label="52-week" value={`${money.price(q.fiftyTwoWeekLow)} – ${money.price(q.fiftyTwoWeekHigh)}`} />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
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
            <Metric label="Target" value={money.price(m.targetPrice)} />
          </div>
          {insights?.recommendation?.provider && (
            <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
              Research snapshot from {insights.recommendation.provider}. Not a recommendation from My Stock Analyzer.
            </p>
          )}
        </section>

        <section className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            Earnings & dividends
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric label="Latest EPS" value={money.price(m.eps)} />
            <Metric label="EPS growth" value={formatPct((m.epsGrowth || 0) * 100, true)} />
            <Metric label="Dividend / share" value={money.price(m.dividendPerShare)} />
            <Metric label="Dividend yield" value={formatPct((m.dividendYield || 0) * 100, false)} />
          </div>
        </section>
      </div>

      <button type="button" onClick={onAnalyze} className="card flex w-full items-center justify-between p-4 text-left">
        <div>
          <div className="text-sm font-semibold">Analyze This Stock</div>
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            Business, growth, financial health, valuation and a fundamental score.
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
  analysis?: Analysis | null;
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
}) {
  const money = useMoney();
  return (
    <div className="space-y-3">
      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Current fundamentals
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Revenue" value={money.compact(m?.revenue)} />
          <Metric label="Net income" value={money.compact(m?.netIncome)} />
          <Metric label="EPS" value={money.price(m?.eps)} />
          <Metric label="Free cash flow" value={money.compact(m?.fcf)} />
          <Metric label="Cash" value={money.compact(m?.cash)} />
          <Metric label="Debt" value={money.compact(m?.debt)} />
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

      {analysis?.items && (
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
          <div className="mt-1 text-[16px] font-semibold">Overall Fundamental Score: {score}/100</div>
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
  onAnalyze,
}: {
  analysis?: Analysis | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAnalyze: () => void;
}) {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const report = analysis?.report;

  if (loading) {
    return (
      <div className="card px-5 py-12 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--ink)]" />
        <div className="text-[15px] font-semibold">Analyzing company fundamentals...</div>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Reading filings, growth, cash flow and valuation.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card px-5 py-8 text-center">
        <div className="text-[15px] font-semibold">Unable to complete the analysis right now.</div>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--ink)" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analysis || !report) {
    return (
      <div className="card px-5 py-8 text-center">
        <Sparkles className="mx-auto mb-3" size={22} />
        <div className="text-[15px] font-semibold">AI Analysis</div>
        <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: "var(--muted)" }}>
          Run an analysis of this company&apos;s business, growth, financial health and valuation using public filings.
        </p>
        <button
          type="button"
          onClick={onAnalyze}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--ink)" }}
        >
          Analyze This Stock
        </button>
      </div>
    );
  }

  const cards = [
    { title: "Business", body: report.business },
    { title: "Growth", body: report.growth },
    { title: "Financial Health", body: report.financialHealth },
    { title: "Competitive Advantage", body: report.competitiveAdvantage },
    { title: "Valuation", body: report.valuation },
    { title: "Risks", body: report.risks },
  ];

  return (
    <div className="space-y-3">
      <section className="card flex items-center gap-4 p-4">
        <ScoreRing score={analysis.score} />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            Overall Fundamental Score
          </div>
          <div className="mt-1 text-lg font-semibold">{analysis.score}/100 · {analysis.label}</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            Final AI Verdict
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Final AI Verdict
        </div>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed">{report.verdict}</p>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {cards.map((c) => (
          <section key={c.title} className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
              {c.title}
            </div>
            {Array.isArray(c.body) ? (
              <ul className="mt-2 space-y-2 text-[13px] leading-relaxed">
                {c.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] leading-relaxed">{c.body}</p>
            )}
          </section>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#1f8df9" }}>
            Strengths
          </div>
          <ul className="mt-2 space-y-2 text-[13px] leading-relaxed">
            {report.strengths.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
        <section className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#dd7a2b" }}>
            Weaknesses
          </div>
          <ul className="mt-2 space-y-2 text-[13px] leading-relaxed">
            {report.weaknesses.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      </div>

      {analysis.dataLimited && (
        <p className="px-1 text-[12px]" style={{ color: "var(--muted)" }}>
          Some filing fields were unavailable. Missing figures are marked as such and were not invented.
        </p>
      )}

      <Checklist items={analysis.items} score={analysis.score} openItem={openItem} setOpenItem={setOpenItem} />
      <p className="px-1 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {analysis.disclaimer}
      </p>
    </div>
  );
}

function PeersTab({ peers, loading }: { peers: (Quote & { metrics?: Metrics })[]; loading: boolean }) {
  const money = useMoney();
  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!peers.length) return <div className="card p-4 text-sm">No close competitors were found in the current universe.</div>;
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
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
                <td className="price px-3 py-2">{money.price(p.price)}</td>
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
  symbol,
  category,
  setCategory,
}: {
  symbol: string;
  category: string;
  setCategory: (c: string) => void;
}) {
  const feed = usePagedNews(
    `stock-news:${symbol}:${category}`,
    (offset) => `/api/stock/${encodeURIComponent(symbol)}/news?category=${encodeURIComponent(category)}&offset=${offset}&limit=20`
  );
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
      { rootMargin: "640px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasMore, feed.loading, feed.error, feed.loadMore, feed.items.length]);

  return (
    <div className="space-y-3">
      <div className="hide-scroll flex gap-1 overflow-x-auto pb-1 touch-pan-x">
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
        {feed.items.map((n) => (
          <NewsCard key={`${n.id}-${n.link}`} item={n} />
        ))}
        {feed.loading && <Skeleton className="h-24" />}
        {!feed.loading && feed.items.length === 0 && !feed.error && <div className="card p-4 text-sm">No stories in this filter yet.</div>}
      </div>
      {feed.error && feed.items.length === 0 && (
        <ErrorBox message="Unable to load news right now." onRetry={() => void feed.loadMore(true)} />
      )}
      {feed.error && feed.items.length > 0 && (
        <div className="card flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span>Couldn&apos;t load more news.</span>
          <button type="button" onClick={() => void feed.loadMore(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--ink)" }}>
            Try Again
          </button>
        </div>
      )}
      <div ref={sentinel} className="h-8" />
    </div>
  );
}
