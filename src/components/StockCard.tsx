import { Link } from "react-router-dom";
import type { Quote } from "../types";
import { formatPrice } from "../lib/format";
import { Avatar, ChangeBadge, Sparkline } from "./ui";
import { StarButton } from "./StarButton";

export function StockCard({
  quote,
  rank,
  extra,
}: {
  quote: Quote;
  rank?: number;
  extra?: string;
}) {
  const pos = (quote.changePercent || 0) >= 0;
  return (
    <Link
      to={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="card rise flex items-center gap-3 px-3 py-3 active:scale-[0.99]"
    >
      {rank != null && (
        <div className="w-6 shrink-0 text-center text-xs font-bold" style={{ color: "var(--muted)" }}>
          {rank}
        </div>
      )}
      <Avatar symbol={quote.symbol} logo={quote.logo} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[14px] font-semibold leading-tight">{quote.name}</div>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px]" style={{ color: "var(--muted)" }}>
          <span className="font-medium">{quote.symbol}</span>
          {extra && <span>· {extra}</span>}
        </div>
      </div>
      <div className="hidden sm:block">
        <Sparkline data={quote.spark} positive={pos} />
      </div>
      <div className="text-right">
        <div className="price text-[14px] font-semibold">{formatPrice(quote.price)}</div>
        <div className="mt-1 flex justify-end">
          <ChangeBadge value={quote.changePercent} />
        </div>
      </div>
      <StarButton symbol={quote.symbol} />
    </Link>
  );
}

export function StockCardSkeleton() {
  return (
    <div className="card flex items-center gap-3 px-3 py-3">
      <div className="skel h-10 w-10 rounded-xl" />
      <div className="flex-1">
        <div className="skel h-3.5 w-28 rounded" />
        <div className="skel mt-2 h-3 w-14 rounded" />
      </div>
      <div className="skel h-4 w-16 rounded" />
    </div>
  );
}
