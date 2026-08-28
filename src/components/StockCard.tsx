import { Link } from "react-router-dom";
import type { Quote } from "../types";
import { useMoney } from "../lib/money";
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
  const money = useMoney();
  return (
    <Link
      to={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="card rise flex min-w-0 items-center gap-2 px-2.5 py-2.5 active:scale-[0.99] sm:gap-3 sm:px-3 sm:py-3"
    >
      {rank != null && (
        <div className="w-5 shrink-0 text-center text-xs font-bold sm:w-6" style={{ color: "var(--muted)" }}>
          {rank}
        </div>
      )}
      <Avatar symbol={quote.symbol} logo={quote.logo} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold leading-tight sm:text-[14px]">{quote.name}</div>
        <div className="mt-0.5 truncate text-[11px] sm:text-[12px]" style={{ color: "var(--muted)" }}>
          <span className="font-medium">{quote.symbol}</span>
          {extra ? <span> · {extra}</span> : null}
        </div>
      </div>
      <div className="hidden shrink-0 md:block">
        <Sparkline data={quote.spark} positive={pos} />
      </div>
      <div className="shrink-0 text-right">
        <div className="price text-[13px] font-semibold sm:text-[14px]">{money.price(quote.price)}</div>
        <div className="mt-1 flex justify-end">
          <ChangeBadge value={quote.changePercent} />
        </div>
      </div>
      <div className="shrink-0">
        <StarButton symbol={quote.symbol} size={16} />
      </div>
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
