import { useMemo, useState } from "react";
import { useApi } from "../lib/hooks";
import type { Quote } from "../types";
import { ChangeBadge, ErrorBox, Skeleton } from "../components/ui";
import { applySort, cycleSort, MarketHead, MarketRow, type SortKey, type SortState } from "../components/MarketRow";
import { formatIndex, marketLabel } from "../lib/format";

const TABS = [
  { id: "hot", label: "Hot" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
  { id: "new", label: "New" },
] as const;

export default function Market() {
  const overview = useApi<{ indices: Quote[] }>("/api/market/overview");
  const lists = useApi<{ hot: Quote[]; gainers: Quote[]; losers: Quote[]; new: Quote[] }>("/api/market/lists");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("hot");
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });

  const source = useMemo(() => {
    if (tab === "gainers") return lists.data?.gainers || [];
    if (tab === "losers") return lists.data?.losers || [];
    if (tab === "new") return lists.data?.new || [];
    return lists.data?.hot || [];
  }, [tab, lists.data]);

  const rows = useMemo(() => applySort(source, sort), [source, sort]);

  const onSort = (key: SortKey) => setSort((prev) => cycleSort(prev, key));

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Market</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {marketLabel(overview.data?.indices?.[0]?.marketState)} · US session
        </p>
      </div>

      {overview.error && <ErrorBox message={overview.error} onRetry={overview.reload} />}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {(overview.data?.indices || []).map((ix) => (
          <div key={ix.symbol} className="card min-w-0 px-3 py-2.5 lg:p-4">
            <div className="truncate text-[11px] font-medium lg:text-[12px]" style={{ color: "var(--muted)" }}>
              {ix.name}
            </div>
            <div className="mt-1 flex min-w-0 items-center justify-between gap-1">
              <div className="price truncate text-[13px] font-semibold lg:text-xl">{formatIndex(ix.price)}</div>
              <ChangeBadge value={ix.changePercent} />
            </div>
          </div>
        ))}
        {overview.loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[62px] lg:h-20" />)}
      </div>

      <div className="hide-scroll flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSort({ key: null, dir: "asc" });
            }}
            className="shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold"
            style={
              tab === t.id
                ? { background: "var(--ink)", color: "var(--bg)" }
                : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--line)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {lists.error && <ErrorBox message={lists.error} onRetry={lists.reload} />}

      <div className="card overflow-hidden px-2 pt-3">
        <MarketHead sort={sort} onSort={onSort} />
        {lists.loading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="my-2 h-14" />)}
        {!lists.loading && rows.map((q) => <MarketRow key={q.symbol} quote={q} />)}
      </div>
    </div>
  );
}
