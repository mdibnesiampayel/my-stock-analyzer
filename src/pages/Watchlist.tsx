import { Link } from "react-router-dom";
import { useApi } from "../lib/hooks";
import { useStore } from "../lib/store";
import type { Quote } from "../types";
import { EmptyState, PrimaryButton } from "../components/ui";
import { StockCard, StockCardSkeleton } from "../components/StockCard";

export default function Watchlist() {
  const { favourites, follows } = useStore();
  const favs = useApi<{ quotes: Quote[] }>(favourites.length ? `/api/quotes?symbols=${favourites.join(",")}` : null);
  const fols = useApi<{ quotes: Quote[] }>(follows.length ? `/api/quotes?symbols=${follows.join(",")}` : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Watchlist</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Favourites and Follows are saved on this device. They are two different actions.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-[16px] font-semibold">Favourites</h2>
        {!favourites.length ? (
          <EmptyState
            title="No favourite stocks yet."
            body="The star on any stock card adds it here."
            action={
              <Link to="/">
                <PrimaryButton>Search for a stock</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {favs.loading && Array.from({ length: 3 }).map((_, i) => <StockCardSkeleton key={i} />)}
            {(favs.data?.quotes || []).map((q) => (
              <StockCard key={q.symbol} quote={q} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[16px] font-semibold">Following</h2>
        <p className="mb-2 text-[12px]" style={{ color: "var(--muted)" }}>
          Followed names contribute to your personalized news feed. They do not automatically become favourites.
        </p>
        {!follows.length ? (
          <EmptyState title="You are not following any stocks." body="Open a company and tap Follow to include its news." />
        ) : (
          <div className="space-y-2">
            {fols.loading && Array.from({ length: 3 }).map((_, i) => <StockCardSkeleton key={i} />)}
            {(fols.data?.quotes || []).map((q) => (
              <StockCard key={q.symbol} quote={q} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
