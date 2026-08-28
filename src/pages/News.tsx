import { useEffect, useRef, useState } from "react";
import { NewsCard } from "../components/NewsCard";
import { ErrorBox, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import type { NewsItem } from "../types";

export default function News() {
  const { follows, settings } = useStore();
  const [mode, setMode] = useState<"follow" | "market">(follows.length ? "follow" : "market");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
  }, [mode, follows.join(",")]);

  useEffect(() => {
    let live = true;
    if (mode === "follow" && follows.length === 0) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      return;
    }
    const symbols = mode === "follow" && follows.length ? follows.join(",") : "";
    setLoading(true);
    setError(null);
    api<{ items: NewsItem[]; hasMore: boolean }>(`/api/news?symbols=${symbols}&offset=${offset}&limit=20`)
      .then((d) => {
        if (!live) return;
        setItems((prev) => (offset === 0 ? d.items : [...prev, ...d.items]));
        setHasMore(d.hasMore);
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [mode, offset, follows, settings.newsCategories]);

  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loading) setOffset((o) => o + 20);
    });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasMore, loading]);

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
      {mode === "follow" && follows.length === 0 && (
        <div className="card p-5 text-sm">
          Follow a stock from its page to build a personalized news feed. Following is stored only on this device.
        </div>
      )}
      {error && <ErrorBox message={error} />}
      <div className="space-y-2">
        {items.map((n) => (
          <NewsCard key={n.id} item={n} />
        ))}
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div ref={sentinel} className="h-8" />
      {!loading && !hasMore && items.length > 0 && (
        <div className="pb-4 text-center text-xs" style={{ color: "var(--muted)" }}>
          You have reached older headlines.
        </div>
      )}
    </div>
  );
}
