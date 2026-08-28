import { yahooJson, fetchText, cached, TTL, mapLimit } from "./http.js";

const CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const SEARCH = "https://query1.finance.yahoo.com/v1/finance/search";
const SPARK = "https://query1.finance.yahoo.com/v7/finance/spark";
const SCREEN = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved";
const TRENDING = "https://query1.finance.yahoo.com/v1/finance/trending";
const INSIGHTS = "https://query1.finance.yahoo.com/ws/insights/v1/finance/insights";
const RSS = "https://feeds.finance.yahoo.com/rss/2.0/headline";

export function logoUrl(symbol) {
  const clean = String(symbol || "")
    .replace(/[.=]/g, "-")
    .replace(/-P$/, "")
    .toUpperCase();
  return `https://storage.googleapis.com/iex/api/logos/${encodeURIComponent(clean)}.png`;
}

export function normalizeQuote(q = {}, extra = {}) {
  const price = num(q.regularMarketPrice ?? q.price);
  const prev = num(q.chartPreviousClose ?? q.previousClose ?? q.regularMarketPreviousClose);
  const change = num(q.regularMarketChange ?? (price != null && prev != null ? price - prev : null));
  const changePercent = num(
    q.regularMarketChangePercent ??
      (price != null && prev ? ((price - prev) / prev) * 100 : null)
  );
  const symbol = q.symbol || extra.symbol;
  return {
    symbol,
    name: q.shortName || q.longName || extra.name || symbol,
    longName: q.longName || q.shortName || extra.longName || extra.name || symbol,
    price,
    previousClose: prev,
    change,
    changePercent,
    volume: num(q.regularMarketVolume ?? q.volume),
    marketCap: num(q.marketCap),
    dayHigh: num(q.regularMarketDayHigh),
    dayLow: num(q.regularMarketDayLow),
    fiftyTwoWeekHigh: num(q.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(q.fiftyTwoWeekLow),
    exchange: q.fullExchangeName || q.exchangeName || q.exchDisp || q.exchange || extra.exchange,
    currency: q.currency || extra.currency || "USD",
    quoteType: q.quoteType || q.instrumentType || extra.quoteType,
    sector: q.sector || q.sectorDisp || extra.sector,
    industry: q.industry || q.industryDisp || extra.industry,
    logo: logoUrl(symbol),
  };
}

function num(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function searchYahoo(q, { quotes = 12, news = 0 } = {}) {
  const query = String(q || "").trim();
  if (!query) return { quotes: [], news: [] };
  return cached(`search:${query}:${quotes}:${news}`, TTL.search, async () => {
    const url = `${SEARCH}?q=${encodeURIComponent(query)}&quotesCount=${quotes}&newsCount=${news}&enableFuzzyQuery=true&enableNavLinks=false`;
    const data = await yahooJson(url);
    const quotesOut = rankQuotes(
      query,
      (data.quotes || [])
        .filter((x) => x.symbol && !String(x.symbol).includes("=") && !/-USD$/i.test(x.symbol))
        .map((x) => ({
          symbol: x.symbol,
          name: x.shortname || x.longname || x.symbol,
          longName: x.longname || x.shortname || x.symbol,
          exchange: x.exchDisp || x.exchange,
          quoteType: x.quoteType,
          type: x.typeDisp,
          sector: x.sectorDisp || x.sector,
          industry: x.industryDisp || x.industry,
          country: x.region || null,
          logo: logoUrl(x.symbol),
        }))
    );
    const newsOut = (data.news || []).map(mapNews);
    return { quotes: quotesOut, news: newsOut };
  });
}

function rankQuotes(query, list) {
  const q = String(query || "").trim().toUpperCase();
  const score = (x) => {
    const sym = String(x.symbol || "").toUpperCase();
    const name = `${x.longName || ""} ${x.name || ""}`.toUpperCase();
    const type = String(x.quoteType || "EQUITY").toUpperCase();
    let s = 0;
    if (type === "EQUITY") s += 25;
    else if (type === "ETF") s += 8;
    if (sym === q) s += 100;
    else if (sym.startsWith(q)) s += 70;
    else if (sym.includes(q)) s += 40;
    if (name === q) s += 90;
    else if (name.startsWith(q)) s += 55;
    else if (name.includes(q)) s += 30;
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a));
}

function mapNews(n) {
  const thumbs = n.thumbnail?.resolutions || [];
  const img = thumbs.find((t) => t.tag === "original") || thumbs[0];
  const title = String(n.title || "").trim();
  return {
    id: n.uuid || n.link || title,
    title,
    publisher: n.publisher || n.provider || "Yahoo Finance",
    link: n.link,
    publishedAt: n.providerPublishTime ? n.providerPublishTime * 1000 : Date.now(),
    thumbnail: img?.url || null,
    related: n.relatedTickers || [],
    summaryRaw: n.summary || n.description || "",
    type: n.type || "STORY",
  };
}

export function clipWords(text, max = 200) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  if (words.length <= max) return words.join(" ");
  return words.slice(0, max).join(" ");
}

export async function articleDescription(url, fallback = "") {
  const fallbackClip = clipWords(fallback, 200);
  if (!url) return fallbackClip;
  return cached(`article:${url}`, TTL.news, async () => {
    try {
      const html = await fetchText(url, { timeout: 7000, retries: 0 });
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
      const body = clipWords(text, 200);
      return body.split(/\s+/).filter(Boolean).length >= 40 ? body : fallbackClip || body;
    } catch {
      return fallbackClip;
    }
  });
}

export async function getChart(symbol, range = "1mo", interval = "1d") {
  const sym = encodeURIComponent(symbol);
  return cached(`chart:${symbol}:${range}:${interval}`, TTL.chart, async () => {
    const url = `${CHART}/${sym}?range=${range}&interval=${interval}&includePrePost=false&events=div%7Csplit`;
    const data = await yahooJson(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`No chart for ${symbol}`);
    const meta = result.meta || {};
    const ts = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const adj = result.indicators?.adjclose?.[0]?.adjclose;
    const candles = [];
    for (let i = 0; i < ts.length; i++) {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      if (open == null || high == null || low == null || close == null) continue;
      candles.push({
        time: ts[i],
        open,
        high,
        low,
        close,
        volume: quote.volume?.[i] ?? 0,
        adjClose: adj?.[i] ?? close,
      });
    }
    const quoteOut = normalizeQuote(meta, { symbol, name: meta.shortName, longName: meta.longName });
    const lastClose = candles.length ? candles[candles.length - 1].close : quoteOut.price;
    const prevSession =
      interval === "1d" && candles.length >= 2
        ? candles[candles.length - 2].close
        : interval === "1wk" && candles.length >= 2
          ? candles[candles.length - 2].close
          : num(meta.chartPreviousClose);
    if (quoteOut.price != null && prevSession) {
      quoteOut.previousClose = prevSession;
      quoteOut.change = quoteOut.price - prevSession;
      quoteOut.changePercent = ((quoteOut.price - prevSession) / prevSession) * 100;
    }
    if (lastClose && quoteOut.price == null) quoteOut.price = lastClose;
    quoteOut.dayHigh = num(meta.regularMarketDayHigh);
    quoteOut.dayLow = num(meta.regularMarketDayLow);
    quoteOut.marketState = inferMarketState(meta);
    return { quote: quoteOut, meta, candles };
  });
}

function inferMarketState(meta) {
  const now = Math.floor(Date.now() / 1000);
  const periods = meta.currentTradingPeriod || {};
  const pre = periods.pre;
  const regular = periods.regular;
  const post = periods.post;
  if (regular && now >= regular.start && now < regular.end) return "open";
  if (pre && now >= pre.start && now < pre.end) return "pre";
  if (post && now >= post.start && now < post.end) return "post";
  return "closed";
}

export async function getSpark(symbols, range = "1mo", interval = "1d") {
  const list = [...new Set(symbols.filter(Boolean))].slice(0, 40);
  if (!list.length) return [];
  const key = `spark:${list.join(",")}:${range}:${interval}`;
  return cached(key, TTL.spark, async () => {
    const url = `${SPARK}?symbols=${encodeURIComponent(list.join(","))}&range=${range}&interval=${interval}`;
    const data = await yahooJson(url);
    const results = data?.spark?.result || [];
    return results.map((item) => {
      const resp = item.response?.[0] || {};
      const meta = resp.meta || {};
      const closes = resp.indicators?.quote?.[0]?.close || [];
      const spark = closes.filter((x) => x != null);
      const q = normalizeQuote(meta, { symbol: item.symbol });
      if (interval === "1d" && spark.length >= 2 && q.price != null) {
        const prevSession = spark[spark.length - 2];
        if (prevSession) {
          q.previousClose = prevSession;
          q.change = q.price - prevSession;
          q.changePercent = ((q.price - prevSession) / prevSession) * 100;
        }
      }
      q.spark = spark.slice(-30);
      return q;
    });
  });
}

export async function getQuotes(symbols) {
  const list = [...new Set((symbols || []).map((s) => String(s).trim()).filter(Boolean))];
  if (!list.length) return [];
  const chunks = [];
  for (let i = 0; i < list.length; i += 12) chunks.push(list.slice(i, i + 12));
  const parts = await mapLimit(chunks, 3, (chunk) => getSpark(chunk, "1mo", "1d"));
  return parts.flat().filter(Boolean);
}

export async function screener(scrId, count = 15) {
  return cached(`screen:${scrId}:${count}`, TTL.screener, async () => {
    const url = `${SCREEN}?formatted=false&scrIds=${encodeURIComponent(scrId)}&count=${count}`;
    const data = await yahooJson(url);
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q) => normalizeQuote(q));
  });
}

export async function trending(region = "US") {
  return cached(`trend:${region}`, TTL.screener, async () => {
    const data = await yahooJson(`${TRENDING}/${region}`);
    return (data?.finance?.result?.[0]?.quotes || []).map((q) => q.symbol).filter(Boolean);
  });
}

export async function getInsights(symbol) {
  return cached(`insights:${symbol}`, TTL.insights, async () => {
    try {
      const data = await yahooJson(`${INSIGHTS}?symbol=${encodeURIComponent(symbol)}`);
      return data?.finance?.result || null;
    } catch {
      return null;
    }
  });
}

export async function getNewsForQuery(query, newsCount = 20) {
  return cached(`news:${query}:${newsCount}`, TTL.news, async () => {
    const { news } = await searchYahoo(query, { quotes: 0, news: newsCount });
    return news;
  });
}

export async function getRssNews(symbol) {
  return cached(`rss:${symbol}`, TTL.news, async () => {
    try {
      const xml = await fetchText(`${RSS}?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`, {
        timeout: 12000,
        retries: 1,
      });
      return parseRss(xml, symbol);
    } catch {
      return [];
    }
  });
}

export async function getGoogleNews(query) {
  const q = String(query || "").trim();
  if (!q) return [];
  return cached(`gnews:${q}`, TTL.news, async () => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      const xml = await fetchText(url, { timeout: 12000, retries: 1 });
      return parseRss(xml, null).map((n) => ({
        ...n,
        publisher: n.publisher && n.publisher !== "Yahoo Finance" ? n.publisher : "Google News",
      }));
    } catch {
      return [];
    }
  });
}

function parseRss(xml, symbol) {
  const items = [];
  const parts = xml.split(/<item>/i).slice(1);
  for (const p of parts) {
    const title = rssTag(p, "title");
    const link = rssTag(p, "link");
    const pubDate = rssTag(p, "pubDate");
    const description = rssTag(p, "description");
    const source = rssTag(p, "source") || "Yahoo Finance";
    if (!title) continue;
    items.push({
      id: link || title,
      title: decodeEntities(title),
      publisher: decodeEntities(source),
      link,
      publishedAt: pubDate ? Date.parse(pubDate) || Date.now() : Date.now(),
      thumbnail: null,
      related: symbol ? [symbol] : [],
      summaryRaw: decodeEntities(stripHtml(description)),
      type: "STORY",
    });
  }
  return items;
}

function rssTag(xml, name) {
  const cdata = xml.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${name}>`, "i"));
  if (cdata) return cdata[1].trim();
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseNasdaqNum(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[$,%]/g, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export async function getUsListedStocks() {
  return cached("uslisted:v1", TTL.universe, async () => {
    const data = await yahooJson("https://api.nasdaq.com/api/screener/stocks?download=true", {
      timeout: 35000,
      headers: {
        Accept: "application/json, text/plain, */*",
        Origin: "https://www.nasdaq.com",
        Referer: "https://www.nasdaq.com/market-activity/stocks/screener",
      },
    });
    const rows = data?.data?.rows || [];
    const quotes = [];
    for (const r of rows) {
      const symbol = String(r.symbol || "")
        .trim()
        .toUpperCase();
      if (!symbol || symbol.includes("^") || symbol.includes("=") || symbol.includes("/")) continue;
      quotes.push({
        symbol,
        name: r.name || symbol,
        longName: r.name || symbol,
        price: parseNasdaqNum(r.lastsale),
        change: parseNasdaqNum(r.netchange),
        changePercent: parseNasdaqNum(r.pctchange),
        volume: parseNasdaqNum(r.volume),
        marketCap: parseNasdaqNum(r.marketCap),
        sector: r.sector || null,
        industry: r.industry || null,
        country: r.country || null,
        logo: logoUrl(symbol),
        currency: "USD",
        quoteType: "EQUITY",
      });
    }
    return quotes;
  });
}

export async function getIpoCalendar() {
  return cached("ipo:recent", TTL.ipo, async () => {
    const now = new Date();
    const months = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    const rows = [];
    for (const month of months) {
      try {
        const data = await yahooJson(
          `https://api.nasdaq.com/api/ipo/calendar?date=${month}`,
          {
            headers: {
              Accept: "application/json, text/plain, */*",
              Origin: "https://www.nasdaq.com",
              Referer: "https://www.nasdaq.com/",
            },
          }
        ).catch(() => null);
        // nasdaq host is not yahooJson UA issue - fetchJson used internally. OK.
        const priced = data?.data?.priced?.rows || [];
        for (const r of priced) {
          const ticker = (r.proposedTickerSymbol || "").replace(/[^A-Za-z0-9.-]/g, "");
          if (!ticker) continue;
          rows.push({
            symbol: ticker,
            name: r.companyName,
            exchange: r.proposedExchange,
            pricedDate: r.pricedDate,
            sharePrice: r.proposedSharePrice,
            sharesOffered: r.sharesOffered,
            dollarValue: r.dollarValueOfSharesOffered,
            dealStatus: r.dealStatus,
          });
        }
      } catch {
        // ignore month
      }
    }
    // de-dupe
    const seen = new Set();
    return rows.filter((r) => {
      const k = r.symbol.toUpperCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
}

export const RANGE_MAP = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
};

export { num, inferMarketState };
