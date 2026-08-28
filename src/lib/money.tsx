import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStore } from "./store";
import { formatCompact, formatPrice } from "./format";
import { currencyMeta } from "./aiProviders";
import { api } from "./api";

interface MoneyCtx {
  code: string;
  rate: number;
  symbol: string;
  ready: boolean;
  converted: boolean;
  price: (usd: number | null | undefined) => string;
  compact: (usd: number | null | undefined) => string;
}

const Ctx = createContext<MoneyCtx | null>(null);
const RATE_CACHE = "stocklens.fxRates";

function readRates(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(RATE_CACHE) || "{}");
  } catch {
    return {};
  }
}

export function MoneyProvider({ children }: { children: ReactNode }) {
  const { settings } = useStore();
  const wanted = (settings.currency || "USD").toUpperCase();
  const [code, setCode] = useState("USD");
  const [rate, setRate] = useState(1);
  const [ready, setReady] = useState(wanted === "USD");

  useEffect(() => {
    let live = true;
    if (wanted === "USD") {
      setCode("USD");
      setRate(1);
      setReady(true);
      return;
    }
    const cached = readRates()[wanted];
    if (cached && cached > 0) {
      setCode(wanted);
      setRate(cached);
      setReady(true);
    } else {
      setReady(false);
    }
    api<{ to: string; rate: number }>(`/api/fx?to=${encodeURIComponent(wanted)}`)
      .then((d) => {
        if (!live || !d.rate || !Number.isFinite(d.rate) || d.rate <= 0) return;
        setCode(wanted);
        setRate(d.rate);
        setReady(true);
        localStorage.setItem(RATE_CACHE, JSON.stringify({ ...readRates(), [wanted]: d.rate }));
      })
      .catch(() => {
        if (!live) return;
        if (cached && cached > 0) return;
        setCode("USD");
        setRate(1);
        setReady(true);
      });
    return () => {
      live = false;
    };
  }, [wanted]);

  const value = useMemo<MoneyCtx>(() => {
    const meta = currencyMeta(code);
    return {
      code,
      rate,
      symbol: meta.symbol,
      ready,
      converted: code !== "USD",
      price: (usd) => {
        if (usd == null || Number.isNaN(usd)) return "—";
        return formatPrice(usd * rate, code);
      },
      compact: (usd) => {
        if (usd == null || Number.isNaN(usd)) return "—";
        return formatCompact(usd * rate, code);
      },
    };
  }, [code, rate, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMoney() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Money missing");
  return ctx;
}
