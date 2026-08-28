import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, X, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounced } from "../lib/hooks";
import { api } from "../lib/api";
import type { NewsItem, SearchHit } from "../types";
import { Avatar } from "./ui";
import { useStore } from "../lib/store";
import { timeAgo } from "../lib/format";

export function SearchBar({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card flex w-full items-center gap-3 px-3.5 py-3 text-left"
    >
      <Search size={18} style={{ color: "var(--muted)" }} />
      <span className="text-sm" style={{ color: "var(--muted)" }}>
        Search stock or company
      </span>
    </button>
  );
}

export function RecentList({
  onPick,
}: {
  onPick?: (symbol: string) => void;
}) {
  const { recent, removeRecent, clearRecent } = useStore();
  const nav = useNavigate();
  if (!recent.length) return null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          <Clock size={12} /> Recent
        </div>
        <button type="button" onClick={clearRecent} className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
          Clear all
        </button>
      </div>
      <div className="space-y-0.5">
        {recent.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => (onPick ? onPick(s) : nav(`/stock/${encodeURIComponent(s)}`))}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[var(--bg-2)]"
            >
              <Avatar symbol={s} logo={`https://storage.googleapis.com/iex/api/logos/${s}.png`} size={32} />
              <span className="truncate text-sm font-semibold">{s}</span>
            </button>
            <button
              type="button"
              aria-label={`Remove ${s} from recent`}
              onClick={() => removeRecent(s)}
              className="shrink-0 rounded-lg p-2"
              style={{ color: "var(--muted)" }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(q, 220);
  const input = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const { addRecent } = useStore();

  useEffect(() => {
    if (open) {
      setTimeout(() => input.current?.focus(), 30);
    } else {
      setQ("");
      setHits([]);
      setNews([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!debounced.trim()) {
      setHits([]);
      setNews([]);
      return;
    }
    let live = true;
    setLoading(true);
    api<{ quotes: SearchHit[]; news: NewsItem[] }>(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then((d) => {
        if (!live) return;
        setHits(d.quotes || []);
        setNews(d.news || []);
      })
      .catch(() => {
        if (!live) return;
        setHits([]);
        setNews([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [debounced]);

  const go = (symbol: string) => {
    addRecent(symbol);
    onClose();
    nav(`/stock/${encodeURIComponent(symbol)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (hits[0]?.symbol) go(hits[0].symbol);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/30 p-3 pt-[6vh] backdrop-blur-[2px] md:pt-[8vh]">
      <div className="card flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden">
        <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--line)" }}>
          <Search size={18} style={{ color: "var(--muted)" }} />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search anything — company, ticker, or topic"
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button type="button" onClick={onClose} className="rounded-lg p-2" aria-label="Close search">
            <X size={18} />
          </button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!q.trim() && <RecentList onPick={go} />}
          {loading && (
            <div className="px-3 py-4 text-sm" style={{ color: "var(--muted)" }}>
              Searching…
            </div>
          )}
          {!loading && q.trim() && hits.length === 0 && news.length === 0 && (
            <div className="px-3 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No matching companies or news for “{q}”.
            </div>
          )}
          {hits.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Stocks
              </div>
              {hits.map((h) => (
                <button
                  key={h.symbol}
                  type="button"
                  onClick={() => go(h.symbol)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--bg-2)]"
                >
                  <Avatar symbol={h.symbol} logo={h.logo} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{h.longName || h.name}</div>
                    <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                      {h.symbol} · {h.exchange || h.type || "US"}
                      {h.country ? ` · ${h.country}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {news.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                News
              </div>
              <div className="space-y-2 p-1">
                {news.map((n) => (
                  <a
                    key={`${n.id}-${n.link}`}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card block p-3"
                  >
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {n.publisher}
                      {n.publishedAt ? ` · ${timeAgo(n.publishedAt)}` : ""}
                      {n.related?.[0] ? ` · ${n.related[0]}` : ""}
                    </div>
                    <h3 className="mt-1 text-[14.5px] font-semibold leading-snug">{n.title}</h3>
                    {n.description && (
                      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                        {n.description}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
