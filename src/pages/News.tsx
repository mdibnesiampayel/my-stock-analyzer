import { useEffect, useRef } from "react";
import { useState } from "react";
import { NewsCard } from "../components/NewsCard";
import { ErrorBox, Skeleton } from "../components/ui";
import { usePagedNews } from "../lib/usePagedNews";
import { useStore } from "../lib/store";

export default function News() {
  const { follows } = useStore();
  const [mode, setMode] = useState<"follow" | "market">(follows.length ? "follow" : "market");
  const symbols = mode === "follow" ? follows.join(",") : "";
  const emptyFollow = mode === "follow" && follows.length === 0;
  const feed = usePagedNews(
    emptyFollow ? "empty" : `news:${mode}:${symbols}`,
    (offset) => (emptyFollow ? null : `/api/news?symbols=${encodeURIComponent(symbols)}&offset=${offset}&limit=20`)
  );

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && feed.hasMore && !feed.loading && !feed.error) {
          void feed.loadMore(false);
        }
      },
      { rootMargin: "640px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasMore, feed.loading, feed.error, feed.loadMore, feed.items.length]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">News</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Short summaries and impact labels. We never claim a headline will make a stock rise.
        </p>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode("follow")}
          className="rounded-full px-3.5 py-2 text-[13px] font-semibold"
          style={mode === "follow" ? { background: "var(--ink)", color: "var(--bg)" } : { background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)" }}
        >
          Following
        </button>
        <button
          type="button"
          onClick={() => setMode("market")}
          className="rounded-full px-3.5 py-2 text-[13px] font-semibold"
          style={mode === "market" ? { background: "var(--ink)", color: "var(--bg)" } : { background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)" }}
        >
          Market
        </button>
      </div>
      {emptyFollow && (
        <div className="card p-5 text-sm">
          Follow a stock from its page to build a personalized news feed. Following is stored only on this device.
        </div>
      )}
      {feed.error && feed.items.length === 0 && (
        <ErrorBox message="Unable to load news right now." onRetry={() => void feed.loadMore(true)} />
      )}
      <div className="mx-auto grid max-w-3xl gap-2 lg:max-w-none lg:grid-cols-2">
        {feed.items.map((n) => (
          <NewsCard key={`${n.id}-${n.link}`} item={n} />
        ))}
        {feed.loading && Array.from({ length: feed.items.length ? 2 : 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      {feed.error && feed.items.length > 0 && (
        <div className="card flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span>Couldn&apos;t load more news.</span>
          <button
            type="button"
            onClick={() => void feed.loadMore(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "var(--ink)" }}
          >
            Try Again
          </button>
        </div>
      )}
      <div ref={sentinel} className="h-10" />
      {!feed.loading && !feed.hasMore && feed.items.length > 0 && (
        <div className="pb-4 text-center text-xs" style={{ color: "var(--muted)" }}>
          You have reached older headlines.
        </div>
      )}
    </div>
  );
}
