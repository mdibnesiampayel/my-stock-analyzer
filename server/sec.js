import { secJson, cached, TTL } from "./http.js";

let tickerMap = null;
let tickerMapAt = 0;

async function loadTickerMap() {
  if (tickerMap && Date.now() - tickerMapAt < TTL.cik) return tickerMap;
  const data = await secJson("https://www.sec.gov/files/company_tickers.json");
  const map = new Map();
  for (const rec of Object.values(data)) {
    if (!rec?.ticker) continue;
    const cik = String(rec.cik_str).padStart(10, "0");
    map.set(String(rec.ticker).toUpperCase(), {
      cik,
      ticker: rec.ticker.toUpperCase(),
      title: rec.title,
    });
  }
  tickerMap = map;
  tickerMapAt = Date.now();
  return map;
}

export function normalizeTicker(symbol) {
  return String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "-");
}

export async function lookupCik(symbol) {
  const t = normalizeTicker(symbol);
  const map = await loadTickerMap();
  if (map.has(t)) return map.get(t);
  // GOOGL -> GOOG, BRK-B, BF-B
  const alt = t.replace(/-P$/, "");
  if (map.has(alt)) return map.get(alt);
  return null;
}

export async function getSubmissions(symbol) {
  const info = await lookupCik(symbol);
  if (!info) return null;
  return cached(`sec:sub:${info.cik}`, TTL.sec, async () => {
    const d = await secJson(`https://data.sec.gov/submissions/CIK${info.cik}.json`);
    const biz = d.addresses?.business || d.addresses?.mailing || {};
    return {
      cik: info.cik,
      name: d.name,
      tickers: d.tickers || [info.ticker],
      exchanges: d.exchanges || [],
      sic: d.sic,
      sicDescription: d.sicDescription,
      category: d.category,
      entityType: d.entityType,
      phone: d.phone,
      fiscalYearEnd: d.fiscalYearEnd,
      stateOfIncorporation: d.stateOfIncorporation,
      headquarters: [biz.city, biz.stateOrCountryDescription || biz.stateOrCountry, biz.zipCode]
        .filter(Boolean)
        .join(", "),
      street: biz.street1,
    };
  });
}

export async function getFundamentals(symbol) {
  const info = await lookupCik(symbol);
  if (!info) return null;
  return cached(`sec:facts:${info.cik}`, TTL.sec, async () => {
    const d = await secJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${info.cik}.json`);
    const gaap = d.facts?.["us-gaap"] || {};
    const ifrs = d.facts?.["ifrs-full"] || {};
    const facts = Object.keys(gaap).length ? gaap : ifrs;
    const unit = Object.keys(gaap).length ? "USD" : "USD";

    const revenue = series(facts, [
      "Revenues",
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "SalesRevenueNet",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
      "TurnoverRevenue",
    ], unit);
    const netIncome = series(facts, ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"], unit);
    const eps = series(facts, ["EarningsPerShareDiluted", "EarningsPerShareBasic"], "USD/shares", unit);
    const cfo = series(facts, ["NetCashProvidedByUsedInOperatingActivities"], unit);
    const capex = series(facts, [
      "PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsToAcquireProductiveAssets",
      "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
    ], unit);
    const cash = series(facts, [
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsAndShortTermInvestments",
      "Cash",
    ], unit);
    const debtLt = series(facts, [
      "LongTermDebt",
      "LongTermDebtNoncurrent",
      "LongTermDebtAndCapitalLeaseObligations",
    ], unit);
    const debtSt = series(facts, ["DebtCurrent", "ShortTermBorrowings", "LongTermDebtCurrent"], unit);
    const assets = series(facts, ["Assets"], unit);
    const equity = series(facts, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"], unit);
    const liabilities = series(facts, ["Liabilities"], unit);
    const shares = series(facts, ["CommonStockSharesOutstanding", "WeightedAverageNumberOfDilutedSharesOutstanding"], "shares");
    const dividends = series(facts, [
      "CommonStockDividendsPerShareDeclared",
      "CommonStockDividendsPerShareCashPaid",
    ], "USD/shares", unit);
    const grossProfit = series(facts, ["GrossProfit"], unit);
    const operatingIncome = series(facts, ["OperatingIncomeLoss"], unit);

    const fcf = alignFcf(cfo.annual, capex.annual);

    const latestShares = last(shares.latest ? [shares.latest] : shares.annual);
    // DEI shares often more current
    const deiShares = latestDeiShares(d.facts?.dei);

    return {
      cik: info.cik,
      entityName: d.entityName,
      revenue,
      netIncome,
      eps,
      cash,
      debt: {
        annual: mergeDebt(debtLt.annual, debtSt.annual),
        latest: addVals(last(debtLt.annual), last(debtSt.annual)),
      },
      assets,
      equity,
      liabilities,
      cfo,
      capex,
      fcf: { annual: fcf, latest: last(fcf) },
      sharesOutstanding: deiShares || latestShares?.value || last(shares.annual)?.value || null,
      dividends,
      grossProfit,
      operatingIncome,
      asOf: last(revenue.annual)?.end || last(netIncome.annual)?.end || null,
    };
  });
}

function latestDeiShares(dei) {
  if (!dei) return null;
  const fact = dei.EntityCommonStockSharesOutstanding;
  const units = fact?.units?.shares || fact?.units?.pure;
  if (!units?.length) return null;
  const sorted = [...units].sort((a, b) => String(b.end).localeCompare(String(a.end)));
  return sorted[0]?.val ?? null;
}

function series(facts, keys, unit, fallbackUnit) {
  const candidates = [];
  for (const key of keys) {
    const fact = facts[key];
    if (!fact?.units) continue;
    const arr = fact.units[unit] || fact.units[fallbackUnit] || Object.values(fact.units)[0];
    if (!arr?.length) continue;
    const annual = pickAnnual(arr);
    const latest = last(annual) || pickLatest(arr);
    if (annual.length || latest) {
      candidates.push({
        key,
        annual,
        latest,
        quarterly: pickQuarterly(arr),
        recency: latest?.end || annual[annual.length - 1]?.end || "",
      });
    }
  }
  if (!candidates.length) return { key: keys[0], annual: [], latest: null, quarterly: [] };
  candidates.sort((a, b) => String(b.recency).localeCompare(String(a.recency)));
  const best = candidates[0];
  return { key: best.key, annual: best.annual, latest: best.latest, quarterly: best.quarterly };
}

function pickAnnual(arr) {
  const fy = arr.filter((x) => {
    const form = x.form || "";
    const fp = x.fp || "";
    return (form.startsWith("10-K") || form.startsWith("20-F") || form.startsWith("40-F")) && (fp === "FY" || fp === "" || !fp);
  });
  const source = fy.length ? fy : arr.filter((x) => (x.fp === "FY" || /Y/.test(x.fp || "")) && x.val != null);
  const byEnd = new Map();
  for (const row of source) {
    if (row.val == null || !row.end) continue;
    const prev = byEnd.get(row.end);
    if (!prev || String(row.filed || "") > String(prev.filed || "")) byEnd.set(row.end, row);
  }
  return [...byEnd.values()]
    .sort((a, b) => String(a.end).localeCompare(String(b.end)))
    .slice(-6)
    .map(shape);
}

function pickQuarterly(arr) {
  const q = arr.filter((x) => /^Q[1-4]$/.test(x.fp || "") && (x.form || "").startsWith("10-Q"));
  const byEnd = new Map();
  for (const row of q) {
    if (row.val == null || !row.end) continue;
    const prev = byEnd.get(row.end);
    if (!prev || String(row.filed || "") > String(prev.filed || "")) byEnd.set(row.end, row);
  }
  return [...byEnd.values()]
    .sort((a, b) => String(a.end).localeCompare(String(b.end)))
    .slice(-8)
    .map(shape);
}

function pickLatest(arr) {
  const usable = arr.filter((x) => x.val != null && x.end);
  if (!usable.length) return null;
  usable.sort((a, b) => String(b.end).localeCompare(String(a.end)) || String(b.filed || "").localeCompare(String(a.filed || "")));
  return shape(usable[0]);
}

function shape(row) {
  return {
    value: row.val,
    end: row.end,
    fy: row.fy,
    fp: row.fp,
    form: row.form,
    filed: row.filed,
    year: row.end ? Number(String(row.end).slice(0, 4)) : row.fy,
  };
}

function last(arr) {
  return arr?.length ? arr[arr.length - 1] : null;
}

function addVals(a, b) {
  if (!a && !b) return null;
  const value = (a?.value || 0) + (b?.value || 0);
  return { value, end: a?.end || b?.end, year: a?.year || b?.year, form: a?.form || b?.form };
}

function mergeDebt(lt, st) {
  const ends = new Set([...lt.map((x) => x.end), ...st.map((x) => x.end)]);
  const out = [];
  for (const end of [...ends].sort()) {
    const a = lt.find((x) => x.end === end);
    const b = st.find((x) => x.end === end);
    out.push({
      value: (a?.value || 0) + (b?.value || 0),
      end,
      year: a?.year || b?.year,
      form: a?.form || b?.form,
    });
  }
  return out.slice(-6);
}

function alignFcf(cfo, capex) {
  const ends = cfo.map((x) => x.end);
  return ends.map((end) => {
    const c = cfo.find((x) => x.end === end);
    const x = capex.find((y) => y.end === end);
    // capex is typically reported as positive outflow
    const cap = x?.value != null ? Math.abs(x.value) : 0;
    const fcf = (c?.value || 0) - cap;
    return { value: fcf, end, year: c?.year, form: c?.form, cfo: c?.value, capex: x?.value ?? null };
  });
}

export async function getWikiAbout(name) {
  if (!name) return null;
  return cached(`wiki:${name}`, TTL.wiki, async () => {
    try {
      const search = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&utf8=&format=json&srlimit=1`,
        { headers: { "User-Agent": "MyStockAnalyzer/1.0 (github.com/mdibnesiampayel/my-stock-analyzer)", Accept: "application/json" } }
      );
      if (!search.ok) return null;
      const sj = await search.json();
      const title = sj?.query?.search?.[0]?.title;
      if (!title) return null;
      const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
        headers: { "User-Agent": "MyStockAnalyzer/1.0 (github.com/mdibnesiampayel/my-stock-analyzer)", Accept: "application/json" },
      });
      if (!sumRes.ok) return null;
      const sum = await sumRes.json();
      return {
        title: sum.title,
        extract: sum.extract,
        url: sum.content_urls?.desktop?.page || null,
      };
    } catch {
      return null;
    }
  });
}

export function yoy(seriesAnnual) {
  if (!seriesAnnual || seriesAnnual.length < 2) return null;
  const a = seriesAnnual[seriesAnnual.length - 1]?.value;
  const b = seriesAnnual[seriesAnnual.length - 2]?.value;
  if (a == null || b == null || b === 0) return null;
  return (a - b) / Math.abs(b);
}

export function cagr(seriesAnnual, years = 3) {
  if (!seriesAnnual || seriesAnnual.length < 2) return null;
  const arr = seriesAnnual.filter((x) => x.value != null);
  if (arr.length < 2) return null;
  const lastP = arr[arr.length - 1];
  const first = arr[Math.max(0, arr.length - 1 - years)];
  if (!first?.value || first.value <= 0 || !lastP?.value) return null;
  const n = Math.max(1, (arr.length - 1 - Math.max(0, arr.length - 1 - years)));
  const yrs = Math.max(1, (new Date(lastP.end) - new Date(first.end)) / (365.25 * 24 * 3600 * 1000));
  return Math.pow(lastP.value / first.value, 1 / Math.max(yrs, 1)) - 1;
}
