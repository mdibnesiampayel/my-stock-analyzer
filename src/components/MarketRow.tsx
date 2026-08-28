import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Quote } from "../types";
import { formatVolume } from "../lib/format";
import { useMoney } from "../lib/money";
import { Avatar, ChangeBadge } from "./ui";

export type SortKey = "name" | "volume" | "price" | "change";
export type SortDir = "asc" | "desc";
export type SortState = { key: SortKey | null; dir: SortDir };

const FIRST: Record<SortKey, SortDir> = {
  name: "asc",
  volume: "desc",
  price: "desc",
  change: "desc",
};

export function cycleSort(prev: SortState, key: SortKey): SortState {
  if (prev.key !== key) return { key, dir: FIRST[key] };
  if (prev.dir === FIRST[key]) return { key, dir: FIRST[key] === "asc" ? "desc" : "asc" };
  return { key: null, dir: "asc" };
}

export function applySort(rows: Quote[], sort: SortState): Quote[] {
  if (!sort.key) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let av: string | number = 0;
    let bv: string | number = 0;
    if (sort.key === "name") {
      av = (a.symbol || "").toUpperCase();
      bv = (b.symbol || "").toUpperCase();
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    }
    if (sort.key === "volume") {
      av = a.volume ?? -1;
      bv = b.volume ?? -1;
    } else if (sort.key === "price") {
      av = a.price ?? -Infinity;
      bv = b.price ?? -Infinity;
    } else {
      av = a.changePercent ?? -Infinity;
      bv = b.changePercent ?? -Infinity;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

export function SortArrows({ active, dir }: { active: boolean; dir: SortDir }) {
  const up = active && dir === "asc";
  const down = active && dir === "desc";
  return (
    <span className="ml-0.5 inline-flex flex-col leading-none">
      <ChevronUp size={10} strokeWidth={2.6} style={{ color: up ? "var(--text)" : "var(--muted)", opacity: up ? 1 : 0.35 }} />
      <ChevronDown size={10} strokeWidth={2.6} className="-mt-0.5" style={{ color: down ? "var(--text)" : "var(--muted)", opacity: down ? 1 : 0.35 }} />
    </span>
  );
}

export function MarketHead({ sort, onSort }: { sort: SortState; onSort: (key: SortKey) => void }) {
  return (
    <div className="flex items-end gap-2 px-1 pb-2 text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => onSort("name")} className="inline-flex items-center">
          Name
          <SortArrows active={sort.key === "name"} dir={sort.dir} />
        </button>
        <span className="mx-1">/</span>
        <button type="button" onClick={() => onSort("volume")} className="inline-flex items-center">
          Vol
          <SortArrows active={sort.key === "volume"} dir={sort.dir} />
        </button>
      </div>
      <button type="button" onClick={() => onSort("price")} className="inline-flex w-[88px] shrink-0 items-center justify-end sm:w-[100px]">
        Last Price
        <SortArrows active={sort.key === "price"} dir={sort.dir} />
      </button>
      <button type="button" onClick={() => onSort("change")} className="inline-flex w-[84px] shrink-0 items-center justify-end">
        Change(%)
        <SortArrows active={sort.key === "change"} dir={sort.dir} />
      </button>
    </div>
  );
}

export function MarketRow({ quote }: { quote: Quote }) {
  const money = useMoney();
  return (
    <Link
      to={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="flex min-w-0 items-center gap-2.5 border-b px-1 py-2.5"
      style={{ borderColor: "var(--line)" }}
    >
      <Avatar symbol={quote.symbol} logo={quote.logo} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-tight">{quote.symbol}</div>
        <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--muted)" }}>
          {quote.name}
          {quote.volume != null ? `  |  ${formatVolume(quote.volume)}` : ""}
        </div>
      </div>
      <div className="w-[88px] shrink-0 text-right sm:w-[100px]">
        <div className="price text-[14px] font-semibold leading-tight">{money.price(quote.price)}</div>
      </div>
      <div className="w-[84px] shrink-0 text-right">
        <ChangeBadge value={quote.changePercent} className="rounded-lg px-2 py-1 text-[12px]" />
      </div>
    </Link>
  );
}
