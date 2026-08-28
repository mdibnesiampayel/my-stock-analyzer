import { yoy } from "./sec.js";

const POSITIVE_WORDS = [
  "beat", "beats", "surge", "surges", "record", "growth", "wins", "win", "approval",
  "launch", "launches", "upgrade", "upgraded", "buyback", "raises", "raised", "strong",
  "outperform", "profit", "profits", "expansion", "expands", "partnership", "contract",
  "breakthrough", "rally", "rallies", "all-time high", "exceeds", "better-than-expected",
  "dividend increase", "initiates", "overweight", "buy rating",
];
const NEGATIVE_WORDS = [
  "miss", "misses", "cut", "cuts", "lawsuit", "probe", "ban", "banned", "downgrade",
  "downgraded", "delay", "delayed", "layoff", "layoffs", "loss", "losses", "warning",
  "fraud", "investigation", "recall", "weak", "slump", "plunge", "plunges", "crash",
  "underperform", "sell rating", "guidance cut", "shortfall", "decline", "declines",
  "tariff", "export ban", "antitrust", "fine", "penalty",
];

export const NEWS_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "earnings", label: "Earnings", words: ["earnings", "eps", "revenue", "guidance", "quarter", "results", "outlook", "beat", "miss", "fy "] },
  { id: "products", label: "Products", words: ["launch", "product", "unveils", "unveiled", "release", "chip", "model", "platform", "device"] },
  { id: "technology", label: "Technology", words: ["ai", "semiconductor", "patent", "r&d", "breakthrough", "gpu", "software", "cloud", "data center"] },
  { id: "management", label: "Management", words: ["ceo", "cfo", "resign", "appoint", "director", "insider", "executive", "founder", "chairman"] },
  { id: "regulation", label: "Regulation", words: ["sec", "antitrust", "ftc", "doj", "ban", "tariff", "china", "export", "regulator", "compliance", "probe"] },
  { id: "analyst", label: "Analyst", words: ["upgrade", "downgrade", "price target", "initiate", "overweight", "rating", "analyst", "overvalued", "underweight"] },
  { id: "ma", label: "M&A", words: ["acquire", "acquisition", "merger", "takeover", "buyout", "deal to buy", "purchas"] },
  { id: "partnerships", label: "Partnerships", words: ["partner", "partnership", "collaboration", "alliance", "agreement", "contract with", "joint venture"] },
];

const SIMPLE_SECTORS = new Set([
  "Consumer Defensive",
  "Consumer Cyclical",
  "Consumer Staples",
  "Restaurants",
  "Retail",
  "Communication Services",
]);
const COMPLEX_SECTORS = new Set(["Healthcare", "Financial Services", "Financials", "Real Estate"]);
const COMPLEX_INDUSTRY = /biotech|bank|insurance|spac|crypto|blank check|pharma|diagnostic|reits?/i;

export function classifyNews(item) {
  const text = `${item.title || ""} ${item.summaryRaw || ""}`.toLowerCase();
  let category = "all";
  let catScore = 0;
  for (const c of NEWS_CATEGORIES) {
    if (c.id === "all") continue;
    const hits = (c.words || []).filter((w) => text.includes(w)).length;
    if (hits > catScore) {
      catScore = hits;
      category = c.id;
    }
  }
  const pos = POSITIVE_WORDS.filter((w) => text.includes(w)).length;
  const neg = NEGATIVE_WORDS.filter((w) => text.includes(w)).length;
  let impact = "neutral";
  let confidence = "Low";
  if (pos > neg && pos > 0) impact = "positive";
  else if (neg > pos && neg > 0) impact = "negative";
  const strength = Math.max(pos, neg);
  if (strength >= 3) confidence = "High";
  else if (strength >= 1) confidence = "Medium";

  const summary = buildNewsSummary(item, impact, category);
  return {
    ...item,
    category: catScore ? category : "all",
    impact,
    impactLabel:
      impact === "positive" ? "Potentially Positive" : impact === "negative" ? "Potentially Negative" : "Neutral / Unclear",
    confidence,
    summary,
  };
}

function buildNewsSummary(item, impact, category) {
  const raw = (item.summaryRaw || "").replace(/\s+/g, " ").trim();
  const title = item.title || "";
  const what = raw ? clip(raw, 220) : clip(title, 180);
  const why =
    category === "earnings"
      ? "Earnings news can move a stock if results or guidance differ from what investors expected."
      : category === "regulation"
        ? "Regulatory news can affect how freely the company operates or sells its products."
        : category === "ma"
          ? "Deal news can change the company's size, debt, and future earnings power."
          : category === "analyst"
            ? "Analyst actions can influence short-term sentiment, but they are opinions, not facts."
            : category === "products"
              ? "Product news matters because new offerings can support future revenue."
              : "This may affect how investors view the company's near-term story.";
  const tone =
    impact === "positive"
      ? "This news may be positive because the headline points to a constructive development."
      : impact === "negative"
        ? "This news may be negative because the headline points to a setback or added risk."
        : "The market impact is unclear from the headline alone.";
  return {
    whatHappened: what,
    whyItMatters: why,
    businessEffect: tone,
    short: clip(raw || title, 140),
  };
}

function clip(s, n) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

export function analyzeStock({ quote, profile, fundamentals, insights, peers }) {
  const items = [];
  items.push(rateBusiness(profile));
  items.push(rateRevenue(fundamentals));
  items.push(rateProfit(fundamentals));
  items.push(rateDebt(fundamentals));
  items.push(rateFcf(fundamentals));
  items.push(rateCompetitive(fundamentals, insights, quote, peers));
  items.push(rateValuation(quote, fundamentals, insights));
  items.push(rateFuture(fundamentals, insights, profile));

  const weights = [8, 16, 16, 12, 14, 12, 12, 10];
  let score = 0;
  items.forEach((it, i) => {
    const frac = it.rating === "good" ? 1 : it.rating === "watch" ? 0.5 : 0.15;
    it.points = Math.round(weights[i] * frac);
    it.max = weights[i];
    score += it.points;
  });
  score = Math.max(0, Math.min(100, Math.round(score)));

  const thesis = buildThesis(quote, profile, items, score, insights);
  const bull = items.filter((x) => x.rating === "good").slice(0, 4).map((x) => x.headline);
  const bear = items.filter((x) => x.rating !== "good").slice(0, 4).map((x) => x.headline);
  if (!bull.length) bull.push("The available filings still show an operating business worth monitoring.");
  if (!bear.length) bear.push("Even strong companies can be expensive or face unexpected competition.");

  return {
    score,
    label: score >= 80 ? "Strong fundamentals" : score >= 65 ? "Solid, with caveats" : score >= 50 ? "Mixed picture" : "Higher risk",
    items,
    thesis,
    bull,
    bear,
    disclaimer:
      "This is an automated research snapshot based on public filings and market data. It is not a recommendation to buy or sell.",
  };
}

function rate(id, question, rating, headline, reason) {
  return { id, question, rating, ratingLabel: rating === "good" ? "Good" : rating === "watch" ? "Needs Attention" : "Risk", headline, reason };
}

function rateBusiness(profile) {
  const q = "Do I understand the business?";
  const sector = profile?.sector || "";
  const industry = profile?.industry || profile?.sicDescription || "";
  const about = profile?.about || "";
  if (!sector && !about) {
    return rate("business", q, "watch", "Limited public description", "We could not find a clear, simple description of what this company does. Read the about section before investing.");
  }
  if (COMPLEX_INDUSTRY.test(industry) || /blank check/i.test(profile?.name || "")) {
    return rate(
      "business",
      q,
      "watch",
      "The business is harder for beginners",
      `${profile.name || "This company"} operates in ${industry || sector}. ${clip(about, 180)} Businesses like this can be harder to understand because results often depend on specialized science, leverage, or one-off deals.`
    );
  }
  if (COMPLEX_SECTORS.has(sector) && !SIMPLE_SECTORS.has(sector)) {
    return rate(
      "business",
      q,
      "watch",
      "Somewhat specialized business",
      `${profile.name || "This company"} is in ${sector}${industry ? ` (${industry})` : ""}. ${clip(about, 160)} You can still invest, but you should be able to explain how it makes money in one or two sentences.`
    );
  }
  return rate(
    "business",
    q,
    "good",
    "The business can be explained simply",
    `${profile.name || "This company"} is in ${sector || "a recognizable industry"}${industry ? ` — ${industry}` : ""}. ${clip(about, 200) || "Its products or services are relatively straightforward for an ordinary investor to understand."}`
  );
}

function rateRevenue(f) {
  const q = "Is revenue growing?";
  const g = yoy(f?.revenue?.annual);
  const latest = lastVal(f?.revenue);
  if (g == null) return rate("revenue", q, "watch", "Revenue trend is unclear", "Not enough annual revenue history was found in SEC filings to judge growth.");
  const pretty = pct(g);
  const dollars = money(latest);
  if (g >= 0.1) return rate("revenue", q, "good", `Revenue is growing ${pretty}`, `Latest reported revenue is ${dollars}. Year-over-year growth of ${pretty} is a healthy sign that demand is expanding.`);
  if (g >= 0) return rate("revenue", q, "watch", `Revenue is growing slowly (${pretty})`, `Latest reported revenue is ${dollars}. Growth is positive but modest. Slow growth is not always bad, but it leaves less room for error.`);
  return rate("revenue", q, "risk", `Revenue declined ${pretty}`, `Latest reported revenue is ${dollars}. A decline in sales is a warning sign unless there is a clear, temporary reason.`);
}

function rateProfit(f) {
  const q = "Is profit/EPS growing?";
  const g = yoy(f?.eps?.annual) ?? yoy(f?.netIncome?.annual);
  const eps = lastVal(f?.eps);
  const ni = lastVal(f?.netIncome);
  if (g == null && ni == null) return rate("profit", q, "watch", "Profit trend is unclear", "Earnings history was not available in a usable form.");
  if (ni != null && ni < 0) return rate("profit", q, "risk", "The company is not currently profitable", `Latest net income is ${money(ni)}. Losses can be acceptable for young growers, but they raise the risk that shareholders are diluted or the story breaks.`);
  const pretty = pct(g);
  if (g >= 0.1) return rate("profit", q, "good", `Earnings are growing ${pretty}`, `Latest EPS is ${eps != null ? eps.toFixed(2) : "n/a"} and net income is ${money(ni)}. Double-digit earnings growth is a constructive sign.`);
  if (g >= 0) return rate("profit", q, "watch", `Earnings growth is modest (${pretty})`, `Latest net income is ${money(ni)}. Profits are not shrinking, but they are not compounding quickly either.`);
  return rate("profit", q, "risk", `Earnings declined ${pretty}`, `Latest net income is ${money(ni)}. Falling profits often mean the stock needs a cheaper price to be interesting.`);
}

function rateDebt(f) {
  const q = "Is debt manageable?";
  const debt = lastVal(f?.debt);
  const cash = lastVal(f?.cash);
  const equity = lastVal(f?.equity);
  const assets = lastVal(f?.assets);
  if (debt == null && cash == null) return rate("debt", q, "watch", "Balance sheet is incomplete", "Cash and debt figures were not available.");
  const net = (debt || 0) - (cash || 0);
  const de = equity ? (debt || 0) / Math.abs(equity) : null;
  if (net <= 0) return rate("debt", q, "good", "The company has more cash than debt", `Cash is ${money(cash)} versus debt of ${money(debt)}. A net cash balance is a cushion in a downturn.`);
  if (de != null && de < 1) return rate("debt", q, "good", "Debt looks manageable", `Debt is ${money(debt)} against equity of ${money(equity)} (D/E ${de.toFixed(2)}). Leverage exists, but it does not look aggressive.`);
  if (de != null && de < 2) return rate("debt", q, "watch", "Debt deserves a closer look", `Debt/equity is ${de.toFixed(2)}. This is not automatically dangerous, but interest costs and refinancing risk should be watched.`);
  if (assets && (debt || 0) / assets > 0.7) return rate("debt", q, "risk", "The balance sheet looks leveraged", `Debt of ${money(debt)} is high relative to assets of ${money(assets)}. High leverage can turn a normal slump into a serious problem.`);
  return rate("debt", q, "watch", "Leverage is elevated", `Debt is ${money(debt)} and cash is ${money(cash)}. Review whether cash flow can comfortably cover interest and maturities.`);
}

function rateFcf(f) {
  const q = "Is free cash flow healthy?";
  const latest = lastVal(f?.fcf);
  const g = yoy(f?.fcf?.annual);
  if (latest == null) return rate("fcf", q, "watch", "Free cash flow is unavailable", "Operating cash flow and capex could not be aligned from filings.");
  if (latest > 0 && (g == null || g >= 0)) return rate("fcf", q, "good", "Free cash flow is positive", `Estimated FCF is ${money(latest)}${g != null ? ` and changed ${pct(g)} versus last year` : ""}. Positive FCF means the business generates cash after maintaining itself.`);
  if (latest > 0 && g < 0) return rate("fcf", q, "watch", "FCF is positive but weaker", `Estimated FCF is ${money(latest)}, down ${pct(g)}. Still cash-generative, but the trend needs watching.`);
  return rate("fcf", q, "risk", "Free cash flow is negative", `Estimated FCF is ${money(latest)}. The company is consuming cash after capex, so it may need to raise money or cut spending.`);
}

function rateCompetitive(f, insights, quote, peers) {
  const q = "Is the company competitive?";
  const ni = lastVal(f?.netIncome);
  const rev = lastVal(f?.revenue);
  const margin = rev ? ni / rev : null;
  const snap = insights?.companySnapshot?.company || {};
  const innov = snap.innovativeness;
  const bits = [];
  if (margin != null) bits.push(`Net margin ${pct(margin)}`);
  if (innov != null) bits.push(`innovation score ${(innov * 100).toFixed(0)}/100 vs sector`);
  if (margin != null && margin >= 0.15 && (innov == null || innov >= 0.55)) {
    return rate("moat", q, "good", "Profitability suggests a strong position", `${bits.join(". ")}. High margins often mean customers will pay for something that is hard to copy.`);
  }
  if (margin != null && margin >= 0.05) {
    return rate("moat", q, "watch", "Competitive position looks average", `${bits.join(". ") || "Margins are modest."} The company is profitable, but the filings do not prove a wide moat.`);
  }
  if (margin != null && margin < 0) {
    return rate("moat", q, "risk", "Weak profits make the moat hard to see", "A business that does not earn money yet may still win long term, but it has not demonstrated competitive strength in the numbers.");
  }
  return rate("moat", q, "watch", "Competitive advantage is not obvious from the data", "We do not have a clean margin or sector snapshot. Read the business description and peer comparison before deciding.");
}

function rateValuation(quote, f, insights) {
  const q = "Is the stock price reasonable?";
  const price = quote?.price;
  const eps = lastVal(f?.eps);
  const pe = price && eps && eps > 0 ? price / eps : null;
  const val = insights?.instrumentInfo?.valuation || {};
  const rec = insights?.instrumentInfo?.recommendation || {};
  const desc = (val.description || "").toLowerCase();
  if (desc.includes("undervalued") || desc.includes("discount")) {
    return rate("value", q, "good", val.description || "The stock screens as discounted", `Third-party snapshot: ${val.description || "undervalued"}${val.discount ? ` (${val.discount})` : ""}.${pe ? ` Trailing P/E is about ${pe.toFixed(1)}.` : ""} A discount is not a guarantee — it can be cheap for a reason.`);
  }
  if (desc.includes("overvalued") || desc.includes("premium")) {
    return rate("value", q, "risk", val.description || "The stock looks expensive", `Valuation snapshot: ${val.description}.${pe ? ` Trailing P/E is about ${pe.toFixed(1)}.` : ""} Paying a premium can work if growth continues, but it leaves less margin of safety.`);
  }
  if (pe != null && pe < 18) return rate("value", q, "good", `Trailing P/E is ${pe.toFixed(1)}`, `At ${fmtPrice(price)} versus EPS of ${eps.toFixed(2)}, the multiple is not demanding compared with many large growers.`);
  if (pe != null && pe < 35) return rate("value", q, "watch", `Trailing P/E is ${pe.toFixed(1)}`, `The price is not obviously cheap. Whether it is reasonable depends on how long today's growth can last.`);
  if (pe != null) return rate("value", q, "risk", `Trailing P/E is ${pe.toFixed(1)}`, `A high multiple means a lot of future success is already in the price. ${rec.rating ? `Analyst snapshot: ${rec.rating}${rec.targetPrice ? ` with a ${fmtPrice(rec.targetPrice)} target` : ""}.` : ""}`);
  return rate("value", q, "watch", "Valuation is hard to pin down", "We could not compute a clean earnings multiple. Use the peer table and your own view of growth.");
}

function rateFuture(f, insights, profile) {
  const q = "Does the company have a good long-term future?";
  const g = yoy(f?.revenue?.annual);
  const rec = insights?.instrumentInfo?.recommendation || {};
  const tech = insights?.instrumentInfo?.technicalEvents || {};
  const sector = profile?.sector || "its industry";
  const rating = (rec.rating || "").toUpperCase();
  if ((g != null && g >= 0.1) && (rating === "BUY" || rating === "OUTPERFORM" || rating === "OVERWEIGHT" || !rating)) {
    return rate("future", q, "good", "Growth and positioning support a long runway", `Revenue is growing ${pct(g)} in ${sector}. ${rating ? `Research snapshot: ${rec.rating}${rec.targetPrice ? ` (target ${fmtPrice(rec.targetPrice)})` : ""}.` : ""} Long-term success still depends on execution and competition.`);
  }
  if (g != null && g < 0) {
    return rate("future", q, "risk", "The recent trend does not show expansion", `Revenue declined ${pct(g)}. A company can recover, but the latest filings do not yet show a compounding future.`);
  }
  return rate("future", q, "watch", "The long-term case is not settled", `The company operates in ${sector}. ${rating ? `Research snapshot: ${rec.rating}.` : ""} ${tech.longTerm ? `Longer-term technical view: ${tech.longTerm}.` : ""} Treat the future as uncertain and size any position modestly.`);
}

function buildThesis(quote, profile, items, score, insights) {
  const name = profile?.name || quote?.name || quote?.symbol;
  const goods = items.filter((i) => i.rating === "good").length;
  const risks = items.filter((i) => i.rating === "risk").length;
  const rec = insights?.instrumentInfo?.recommendation;
  const val = insights?.instrumentInfo?.valuation;
  return `${name} scores ${score}/100 on this simple fundamental checklist (${goods} strengths, ${risks} risks). ${
    profile?.about ? clip(profile.about, 160) : ""
  } ${val?.description ? `Valuation snapshot: ${val.description}${val.discount ? ` (${val.discount})` : ""}.` : ""} ${
    rec?.rating ? `Independent research snapshot: ${rec.rating}${rec.targetPrice ? ` with a ${fmtPrice(rec.targetPrice)} target` : ""}.` : ""
  } Use the checklist below to see exactly why each item was rated.`;
}

function lastVal(s) {
  if (!s) return null;
  if (typeof s.latest === "number") return s.latest;
  if (s.latest?.value != null) return s.latest.value;
  const a = s.annual;
  if (a?.length) return a[a.length - 1].value;
  return null;
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return "n/a";
  const v = n * 100;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function money(n) {
  if (n == null || Number.isNaN(n)) return "n/a";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPrice(n) {
  if (n == null) return "n/a";
  return `$${Number(n).toFixed(2)}`;
}

const PEERS = {
  NVDA: ["AMD", "AVGO", "TSM", "INTC", "QCOM", "MU", "AMAT", "ASML"],
  AMD: ["NVDA", "INTC", "AVGO", "TSM", "QCOM", "MU"],
  INTC: ["AMD", "NVDA", "TSM", "AVGO", "QCOM"],
  AVGO: ["NVDA", "TSM", "QCOM", "AMAT", "TXN", "ADI"],
  TSM: ["NVDA", "INTC", "ASML", "AMAT", "AVGO"],
  AAPL: ["MSFT", "GOOGL", "AMZN", "META", "DELL", "HPQ"],
  MSFT: ["AAPL", "GOOGL", "AMZN", "ORCL", "CRM", "ADBE"],
  GOOGL: ["MSFT", "META", "AMZN", "AAPL", "SNAP"],
  GOOG: ["MSFT", "META", "AMZN", "AAPL"],
  AMZN: ["MSFT", "GOOGL", "WMT", "SHOP", "MELI"],
  META: ["GOOGL", "SNAP", "PINS", "MSFT", "AMZN"],
  TSLA: ["GM", "F", "RIVN", "LCID", "TM"],
  NFLX: ["DIS", "WBD", "AMZN", "PARA", "SPOT"],
  JPM: ["BAC", "WFC", "C", "GS", "MS"],
  BAC: ["JPM", "WFC", "C", "USB"],
  XOM: ["CVX", "COP", "BP", "SHEL", "OXY"],
  CVX: ["XOM", "COP", "BP", "OXY"],
  JNJ: ["PFE", "MRK", "ABBV", "LLY", "UNH"],
  LLY: ["NVO", "JNJ", "MRK", "PFE", "AMGN"],
  UNH: ["ELV", "CVS", "CI", "HUM"],
  WMT: ["AMZN", "COST", "TGT", "KR"],
  COST: ["WMT", "TGT", "AMZN"],
  KO: ["PEP", "MNST", "KDP"],
  PEP: ["KO", "MNST", "KDP"],
  DIS: ["NFLX", "WBD", "CMCSA", "PARA"],
  V: ["MA", "AXP", "PYPL"],
  MA: ["V", "AXP", "PYPL"],
  PYPL: ["V", "MA", "SQ", "AFRM"],
  CRM: ["NOW", "ORCL", "MSFT", "ADBE", "SNOW"],
  ORCL: ["MSFT", "SAP", "CRM", "NOW"],
  ADBE: ["MSFT", "CRM", "INTU"],
  MU: ["NVDA", "AMD", "TSM", "INTC", "WDC", "SNDK"],
  QCOM: ["AVGO", "NVDA", "AAPL", "TXN", "MRVL"],
  MRVL: ["NVDA", "AVGO", "AMD", "QCOM"],
  AMAT: ["LRCX", "KLAC", "ASML", "AMKR"],
  CSCO: ["ANET", "JNPR", "IBM", "ORCL"],
  IBM: ["MSFT", "ORCL", "ACN", "CSCO"],
  BA: ["LMT", "RTX", "NOC", "GD"],
  CAT: ["DE", "CMI", "PCAR"],
  NKE: ["LULU", "ADDYY", "UAA"],
  SBUX: ["MCD", "CMG", "DPZ", "YUM"],
  MCD: ["SBUX", "YUM", "CMG", "DPZ"],
};

export function peerSymbols(symbol, industryHits = []) {
  const s = String(symbol || "").toUpperCase();
  const known = PEERS[s] || [];
  const extra = industryHits.filter((x) => x && x.toUpperCase() !== s);
  const out = [];
  const seen = new Set([s]);
  for (const x of [...known, ...extra]) {
    const u = x.toUpperCase();
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 6) break;
  }
  return out;
}

export { money, pct };
