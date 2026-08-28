import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import {
  searchYahoo,
  getChart,
  getSpark,
  getQuotes,
  screener,
  trending,
  getInsights,
  getNewsForQuery,
  getRssNews,
  getGoogleNews,
  getIpoCalendar,
  RANGE_MAP,
  logoUrl,
} from "./yahoo.js";
import { getSubmissions, getFundamentals, getWikiAbout, yoy, lookupCik } from "./sec.js";
import { analyzeStock, classifyNews, NEWS_CATEGORIES, peerSymbols, money } from "./analysis.js";
import { enhanceReport } from "./llm.js";
import { cached, TTL, mapLimit, yahooJson } from "./http.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "512kb" }));

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const INDICES = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^VIX", label: "VIX" },
];

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "My Stock Analyzer", time: Date.now() });
});

app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 1) return res.json({ quotes: [], news: [] });
    const data = await searchYahoo(q, { quotes: 12, news: 0 });
    res.json(data);
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/quotes", async (req, res) => {
  try {
    const symbols = String(req.query.symbols || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const quotes = await getQuotes(symbols);
    res.json({ quotes });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/chart/:symbol", async (req, res) => {
  try {
    const rangeKey = String(req.query.range || "1M").toUpperCase();
    const mapped = RANGE_MAP[rangeKey] || RANGE_MAP["1M"];
    const data = await getChart(req.params.symbol, mapped.range, mapped.interval);
    res.json({ ...data, range: rangeKey });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/market/overview", async (req, res) => {
  try {
    const quotes = await getSpark(INDICES.map((i) => i.symbol), "5d", "1d");
    const indices = INDICES.map((i) => {
      const q = quotes.find((x) => x.symbol === i.symbol);
      return { ...i, ...(q || {}), name: i.label };
    });
    res.json({ indices, currency: req.query.currency || "USD" });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/market/lists", async (_req, res) => {
  try {
    const [gainers, losers, actives, trend] = await Promise.all([
      screener("day_gainers", 15),
      screener("day_losers", 15),
      screener("most_actives", 25),
      trending("US").catch(() => []),
    ]);
    const hot = await buildHot(actives, gainers, losers, trend);
    const newest = await buildNew();
    const g = equityOnly(gainers).slice(0, 10);
    const l = equityOnly(losers).slice(0, 10);
    const h = hot.slice(0, 10);
    const n = newest.slice(0, 10);
    const sparkQuotes = await getQuotes([...h, ...g, ...l, ...n].map((q) => q.symbol));
    const sparkMap = new Map(sparkQuotes.map((q) => [q.symbol, q.spark]));
    const withSpark = (rows) => rows.map((q) => ({ ...q, spark: sparkMap.get(q.symbol) || q.spark }));
    res.json({
      hot: withSpark(h),
      gainers: withSpark(g),
      losers: withSpark(l),
      new: withSpark(n),
    });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const [chart, insights, searchHit, submissions, fundamentals] = await Promise.all([
      getChart(symbol, "1mo", "1d"),
      getInsights(symbol),
      searchYahoo(symbol, { quotes: 4, news: 0 }).catch(() => ({ quotes: [] })),
      getSubmissions(symbol).catch(() => null),
      getFundamentals(symbol).catch(() => null),
    ]);
    const match = (searchHit.quotes || []).find((q) => q.symbol.toUpperCase() === symbol) || searchHit.quotes?.[0];
    const quote = {
      ...chart.quote,
      sector: match?.sector || submissions?.sicDescription,
      industry: match?.industry || submissions?.sicDescription,
      exchange: chart.quote.exchange || match?.exchange || submissions?.exchanges?.[0],
    };
    const wiki = await getWikiAbout(quote.longName || quote.name).catch(() => null);
    const profile = {
      symbol,
      name: quote.longName || quote.name,
      ticker: symbol,
      exchange: quote.exchange,
      sector: quote.sector,
      industry: quote.industry,
      about: wiki?.extract || null,
      wikiUrl: wiki?.url || null,
      headquarters: submissions?.headquarters || null,
      sicDescription: submissions?.sicDescription || null,
      category: submissions?.category || null,
      logo: logoUrl(symbol),
      cik: submissions?.cik || null,
    };
    const derived = deriveMetrics(quote, fundamentals, insights);
    res.json({
      quote,
      profile,
      insights: slimInsights(insights),
      fundamentals: slimFundamentals(fundamentals),
      metrics: derived,
      marketState: quote.marketState,
    });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/stock/:symbol/analysis", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const [chart, insights, searchHit, submissions, fundamentals] = await Promise.all([
      getChart(symbol, "1mo", "1d"),
      getInsights(symbol),
      searchYahoo(symbol, { quotes: 3, news: 0 }).catch(() => ({ quotes: [] })),
      getSubmissions(symbol).catch(() => null),
      getFundamentals(symbol).catch(() => null),
    ]);
    const match = (searchHit.quotes || []).find((q) => q.symbol.toUpperCase() === symbol);
    const wiki = await getWikiAbout(chart.quote.longName || chart.quote.name).catch(() => null);
    const profile = {
      name: chart.quote.longName || chart.quote.name,
      sector: match?.sector || submissions?.sicDescription,
      industry: match?.industry || submissions?.sicDescription,
      about: wiki?.extract,
      sicDescription: submissions?.sicDescription,
    };
    const metrics = deriveMetrics(chart.quote, fundamentals, insights);
    const analysis = analyzeStock({
      quote: chart.quote,
      profile,
      fundamentals,
      insights,
      peers: [],
    });
    const llm = await enhanceReport(analysis, { quote: chart.quote, profile, metrics });
    if (llm) {
      analysis.report = {
        business: llm.business || analysis.report.business,
        strengths: llm.strengths?.length ? llm.strengths : analysis.report.strengths,
        weaknesses: llm.weaknesses?.length ? llm.weaknesses : analysis.report.weaknesses,
        growth: llm.growth || analysis.report.growth,
        financialHealth: llm.financialHealth || analysis.report.financialHealth,
        competitiveAdvantage: llm.competitiveAdvantage || analysis.report.competitiveAdvantage,
        risks: llm.risks?.length ? llm.risks : analysis.report.risks,
        valuation: llm.valuation || analysis.report.valuation,
        verdict: llm.verdict || analysis.report.verdict,
      };
      analysis.source = "llm";
    }
    res.json({ analysis, metrics });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/stock/:symbol/peers", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const searchHit = await searchYahoo(symbol, { quotes: 4, news: 0 }).catch(() => ({ quotes: [] }));
    const match = searchHit.quotes?.[0];
    let industryHits = [];
    if (match?.industry) {
      const extra = await searchYahoo(match.industry, { quotes: 12, news: 0 }).catch(() => ({ quotes: [] }));
      industryHits = (extra.quotes || [])
        .filter((q) => q.quoteType === "EQUITY" && q.symbol.toUpperCase() !== symbol)
        .map((q) => q.symbol);
    }
    const symbols = peerSymbols(symbol, industryHits);
    const quotes = await getQuotes(symbols);
    const enriched = await mapLimit(quotes, 3, async (q) => {
      try {
        const [f, insights] = await Promise.all([
          getFundamentals(q.symbol).catch(() => null),
          getInsights(q.symbol).catch(() => null),
        ]);
        const metrics = deriveMetrics(q, f, insights);
        return { ...q, metrics, analysisPreview: null };
      } catch {
        return q;
      }
    });
    res.json({ peers: enriched.filter(Boolean) });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/stock/:symbol/news", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const category = String(req.query.category || "all");
    const offset = Number(req.query.offset || 0);
    const limit = Math.min(20, Number(req.query.limit || 20));
    const items = await companyNews(symbol);
    const filtered = items.filter((n) => category === "all" || n.category === category);
    res.json({
      items: filtered.slice(offset, offset + limit),
      offset,
      limit,
      hasMore: offset + limit < filtered.length,
      categories: NEWS_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
    });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const symbols = String(req.query.symbols || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const offset = Number(req.query.offset || 0);
    const limit = Math.min(20, Number(req.query.limit || 20));
    const personalized = symbols.length > 0;
    const items = personalized ? await newsForSymbols(symbols) : await marketNews();
    res.json({
      items: items.slice(offset, offset + limit),
      hasMore: offset + limit < items.length,
      personalized,
      offset,
      limit,
    });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/fx", async (req, res) => {
  try {
    const pair = String(req.query.pair || "USDBDT=X");
    const data = await cached(`fx:${pair}`, TTL.fx, () => getChart(pair, "1d", "5m"));
    res.json({ pair, rate: data.quote.price, currency: pair.replace("USD", "").replace("=X", "") });
  } catch (err) {
    fail(res, err);
  }
});

app.use((err, _req, res, _next) => fail(res, err));

function fail(res, err) {
  console.error(err);
  res.status(500).json({ error: err.message || "Unexpected error" });
}

function equityOnly(list) {
  return (list || []).filter((q) => {
    const s = String(q.symbol || "");
    if (!s) return false;
    if (s.includes("=") || s.startsWith("^") || /-USD$/i.test(s)) return false;
    const t = (q.quoteType || "").toUpperCase();
    if (t && t !== "EQUITY") return false;
    return true;
  });
}

async function buildHot(actives, gainers, losers, trendSymbols) {
  const pool = [];
  const seen = new Set();
  const add = (q, bonus = 0) => {
    if (!q?.symbol) return;
    const s = q.symbol.toUpperCase();
    if (seen.has(s)) return;
    if (!equityOnly([q]).length) return;
    seen.add(s);
    pool.push({ ...q, _bonus: bonus });
  };
  actives.forEach((q, i) => add(q, (25 - i) / 25));
  trendSymbols.slice(0, 15).forEach((s) => add({ symbol: s }, 0.35));
  gainers.slice(0, 8).forEach((q) => add(q, 0.15));
  losers.slice(0, 5).forEach((q) => add(q, 0.1));

  const missing = pool.filter((p) => p.price == null).map((p) => p.symbol);
  if (missing.length) {
    const quotes = await getQuotes(missing);
    for (const q of quotes) {
      const i = pool.findIndex((p) => p.symbol === q.symbol);
      if (i >= 0) pool[i] = { ...pool[i], ...q };
    }
  }

  const scored = pool
    .filter((p) => p.price != null && equityOnly([p]).length)
    .map((p) => {
      const ch = Math.abs(p.changePercent || 0);
      const vol = p.volume || 0;
      const volScore = vol > 0 ? Math.min(Math.log10(vol) / 9, 1) : 0;
      const moveScore = Math.min(ch, 15) / 15;
      const score = 0.34 * moveScore + 0.32 * volScore + 0.2 * Math.min((ch * volScore) / 8, 1) + 0.14 * (p._bonus || 0);
      return { ...p, hotScore: score, rankReason: hotReason(p) };
    })
    .sort((a, b) => b.hotScore - a.hotScore);

  return scored.map((p, i) => ({ ...p, rank: i + 1 }));
}

function hotReason(p) {
  const ch = p.changePercent || 0;
  const vol = p.volume || 0;
  if (vol > 80_000_000 && Math.abs(ch) > 3) return "Heavy volume and a large move";
  if (vol > 50_000_000) return "Among the most traded names today";
  if (ch > 5) return "Sharp gain in the current session";
  if (ch < -5) return "Sharp decline in the current session";
  if (Math.abs(ch) > 2) return "Active price movement";
  return "Elevated market interest";
}

async function buildNew() {
  try {
    const ipos = await getIpoCalendar();
    const usable = ipos.filter((r) => r.symbol && !/[UW]$/.test(r.symbol));
    const quotes = await getQuotes(usable.slice(0, 18).map((r) => r.symbol));
    const bySym = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));
    const rows = usable
      .map((r) => {
        const q = bySym.get(r.symbol.toUpperCase());
        if (!q || q.price == null) return null;
        return {
          ...q,
          name: q.name || r.name,
          listingDate: r.pricedDate,
          ipoPrice: r.sharePrice,
          ipoValue: r.dollarValue,
          exchange: q.exchange || r.exchange,
        };
      })
      .filter(Boolean);
    if (rows.length >= 5) return rows.slice(0, 10);
  } catch (e) {
    console.warn("ipo", e.message);
  }
  // fallback: recently interesting smaller names from actives that aren't mega-caps
  const actives = await screener("most_actives", 25).catch(() => []);
  return equityOnly(actives)
    .filter((q) => q.marketCap && q.marketCap < 30e9)
    .slice(0, 10);
}

function slimInsights(insights) {
  if (!insights) return null;
  return {
    technicals: insights.instrumentInfo?.technicalEvents || null,
    keyTechnicals: insights.instrumentInfo?.keyTechnicals || null,
    valuation: insights.instrumentInfo?.valuation || null,
    recommendation: insights.instrumentInfo?.recommendation || null,
    snapshot: insights.companySnapshot || null,
  };
}

function slimFundamentals(f) {
  if (!f) return null;
  const take = (s) =>
    s
      ? {
          latest: s.latest || (s.annual?.length ? s.annual[s.annual.length - 1] : null),
          annual: (s.annual || []).map((x) => ({
            year: x.year,
            end: x.end,
            value: x.value,
          })),
        }
      : { latest: null, annual: [] };
  return {
    asOf: f.asOf,
    entityName: f.entityName,
    cik: f.cik,
    revenue: take(f.revenue),
    netIncome: take(f.netIncome),
    eps: take(f.eps),
    fcf: take(f.fcf),
    cash: take(f.cash),
    debt: take(f.debt),
    assets: take(f.assets),
    equity: take(f.equity),
    sharesOutstanding: f.sharesOutstanding,
    dividends: take(f.dividends),
  };
}

function deriveMetrics(quote, f, insights) {
  const price = quote?.price;
  const eps = f?.eps?.latest?.value ?? (f?.eps?.annual?.length ? f.eps.annual[f.eps.annual.length - 1].value : null);
  const shares = f?.sharesOutstanding;
  const marketCap = quote?.marketCap || (price && shares ? price * shares : null);
  const pe = price && eps && eps > 0 ? price / eps : null;
  const revenue = f?.revenue?.latest?.value ?? lastAnnual(f?.revenue);
  const netIncome = f?.netIncome?.latest?.value ?? lastAnnual(f?.netIncome);
  const fcf = f?.fcf?.latest?.value ?? lastAnnual(f?.fcf);
  const cash = f?.cash?.latest?.value ?? lastAnnual(f?.cash);
  const debt = f?.debt?.latest?.value ?? lastAnnual(f?.debt);
  const equity = f?.equity?.latest?.value ?? lastAnnual(f?.equity);
  const ps = marketCap && revenue ? marketCap / revenue : null;
  const pb = marketCap && equity ? marketCap / equity : null;
  const margin = revenue ? netIncome / revenue : null;
  const revGrowth = yoy(f?.revenue?.annual);
  const epsGrowth = yoy(f?.eps?.annual);
  const fcfYield = marketCap && fcf ? fcf / marketCap : null;
  const div = f?.dividends?.latest?.value ?? lastAnnual(f?.dividends);
  const divYield = price && div ? div / price : null;
  return {
    marketCap,
    pe,
    eps,
    revenue,
    netIncome,
    fcf,
    cash,
    debt,
    equity,
    sharesOutstanding: shares,
    ps,
    pb,
    profitMargin: margin,
    revenueGrowth: revGrowth,
    epsGrowth,
    fcfYield,
    dividendPerShare: div,
    dividendYield: divYield,
    targetPrice: insights?.instrumentInfo?.recommendation?.targetPrice || null,
    recommendation: insights?.instrumentInfo?.recommendation?.rating || null,
    valuationLabel: insights?.instrumentInfo?.valuation?.description || null,
    valuationDiscount: insights?.instrumentInfo?.valuation?.discount || null,
  };
}

function lastAnnual(s) {
  if (!s?.annual?.length) return null;
  return s.annual[s.annual.length - 1].value;
}

async function companyNews(symbol) {
  return cached(`cnews:${symbol}`, TTL.news, async () => {
    const [searchNews, rss, gnews, earn] = await Promise.all([
      getNewsForQuery(symbol, 40).catch(() => []),
      getRssNews(symbol).catch(() => []),
      getGoogleNews(`${symbol} stock`).catch(() => []),
      getNewsForQuery(`${symbol} earnings`, 20).catch(() => []),
    ]);
    return dedupeNews([...searchNews, ...rss, ...gnews, ...earn]).map(classifyNews);
  });
}

async function newsForSymbols(symbols) {
  const lists = await mapLimit(symbols.slice(0, 12), 4, (s) => companyNews(s));
  return dedupeNews(lists.flat().filter(Boolean));
}

async function marketNews() {
  return cached("news:market", TTL.news, async () => {
    const queries = [
      "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "JPM",
      "stock market", "Federal Reserve", "earnings", "S&P 500",
    ];
    const lists = await mapLimit(queries, 4, (q) => getNewsForQuery(q, 12));
    const rss = await Promise.all(
      ["^GSPC", "AAPL", "MSFT", "NVDA", "AMZN"].map((s) => getRssNews(s).catch(() => []))
    );
    const gnews = await Promise.all(
      ["US stock market", "Wall Street", "S&P 500", "Nasdaq"].map((q) => getGoogleNews(q).catch(() => []))
    );
    return dedupeNews([...lists.flat(), ...rss.flat(), ...gnews.flat()]).map(classifyNews);
  });
}

function dedupeNews(items) {
  const seen = new Set();
  const out = [];
  for (const n of items) {
    if (!n?.title) continue;
    const key = n.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  out.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  return out;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir, { index: false, maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  const mode = fs.existsSync(path.join(distDir, "index.html")) ? "app + API" : "API only";
  console.log(`My Stock Analyzer ${mode} on http://127.0.0.1:${PORT}`);
});
