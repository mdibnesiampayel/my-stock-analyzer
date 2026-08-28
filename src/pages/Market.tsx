import { Link } from "react-router-dom";
import { useApi } from "../lib/hooks";
import type { Quote } from "../types";
import { ChangeBadge, ErrorBox, Skeleton } from "../components/ui";
import { StockCard, StockCardSkeleton } from "../components/StockCard";
import { formatIndex, marketLabel } from "../lib/format";

export default function Market() {
  const overview = useApi<{ indices: Quote[] }>("/api/market/overview");
  const lists = useApi<{ hot: Quote[]; gainers: Quote[]; losers: Quote[]; new: Quote[] }>("/api/market/lists");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Market</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {marketLabel(overview.data?.indices?.[0]?.marketState)} · US session
        </p>
      </div>

      {overview.error && <ErrorBox message={overview.error} onRetry={overview.reload} />}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(overview.data?.indices || []).map((ix) => (
          <div key={ix.symbol} className="card p-4">
            <div className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>
              {ix.name}
            </div>
            <div className="mt-1 flex items-end justify-between">
              <div className="price text-xl font-semibold">{formatIndex(ix.price)}</div>
              <ChangeBadge value={ix.changePercent} />
            </div>
          </div>
        ))}
        {overview.loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListBlock title="Hot today" rows={lists.data?.hot} loading={lists.loading} />
        <ListBlock title="Gainers" rows={lists.data?.gainers} loading={lists.loading} />
        <ListBlock title="Losers" rows={lists.data?.losers} loading={lists.loading} />
        <ListBlock title="Newly listed" rows={lists.data?.new} loading={lists.loading} extra />
      </div>
    </div>
  );
}

function ListBlock({
  title,
  rows,
  loading,
  extra,
}: {
  title: string;
  rows?: Quote[];
  loading: boolean;
  extra?: boolean;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <Link to="/" className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
          Open home
        </Link>
      </div>
      <div className="space-y-2">
        {loading && Array.from({ length: 3 }).map((_, i) => <StockCardSkeleton key={i} />)}
        {(rows || []).slice(0, 5).map((q, i) => (
          <StockCard key={q.symbol} quote={q} rank={i + 1} extra={extra ? q.listingDate : q.rankReason} />
        ))}
      </div>
    </section>
  );
}
