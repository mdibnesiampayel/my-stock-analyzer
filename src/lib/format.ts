import { currencyMeta } from "./aiProviders";

export function formatPrice(n: number | null | undefined, currency = "USD") {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const digits = currency === "JPY" ? 0 : abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.1 ? 3 : 4;
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const meta = currencyMeta(currency);
  if (currency === "USD") return `$${formatted}`;
  if (["EUR", "GBP", "BDT", "JPY", "INR"].includes(currency)) return `${meta.symbol}${formatted}`;
  return `${meta.symbol}${formatted}`;
}

export function formatIndex(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPct(n: number | null | undefined, signed = true) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatRatio(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function formatCompact(n: number | null | undefined, currency = "USD") {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const sym = currency === "USD" ? "$" : currencyMeta(currency).symbol;
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}

export function formatVolume(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

export function timeAgo(ts: number | null | undefined) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function marketLabel(state?: string) {
  if (state === "open") return "US market open";
  if (state === "pre") return "Pre-market";
  if (state === "post") return "After hours";
  return "US market closed";
}

export function changeTone(n: number | null | undefined): "pos" | "neg" | "flat" {
  if (n == null || Math.abs(n) < 0.005) return "flat";
  return n > 0 ? "pos" : "neg";
}
