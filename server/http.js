const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const SEC_UA = "MyStockAnalyzer/1.0 (research app; github.com/mdibnesiampayel/my-stock-analyzer)";

const cache = new Map();

export function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache.delete(key);
    return null;
  }
  return hit.val;
}

export function setCache(key, val, ttlMs) {
  cache.set(key, { val, exp: Date.now() + ttlMs });
  return val;
}

export async function cached(key, ttlMs, fn) {
  const hit = getCache(key);
  if (hit !== null && hit !== undefined) return hit;
  const val = await fn();
  return setCache(key, val, ttlMs);
}

export async function fetchText(url, { headers = {}, timeout = 18000, retries = 2, userAgent } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": userAgent || YAHOO_UA,
          Accept: "application/json, text/plain, */*",
          ...headers,
        },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${url} ${body.slice(0, 180)}`);
      }
      return await res.text();
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      if (i < retries) await sleep(350 * (i + 1));
    }
  }
  throw lastErr;
}

export async function fetchJson(url, opts = {}) {
  const text = await fetchText(url, opts);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 160)}`);
  }
}

export function yahooJson(url, extra = {}) {
  return fetchJson(url, { userAgent: YAHOO_UA, ...extra });
}

export function secJson(url, extra = {}) {
  return fetchJson(url, { userAgent: SEC_UA, timeout: 25000, ...extra });
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch {
        out[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const TTL = {
  search: 30_000,
  quote: 20_000,
  spark: 40_000,
  chart: 45_000,
  screener: 60_000,
  news: 90_000,
  insights: 5 * 60_000,
  profile: 12 * 60 * 60_000,
  sec: 12 * 60 * 60_000,
  cik: 24 * 60 * 60_000,
  ipo: 60 * 60_000,
  universe: 3 * 60_000,
  wiki: 24 * 60 * 60_000,
  fx: 10 * 60_000,
};
