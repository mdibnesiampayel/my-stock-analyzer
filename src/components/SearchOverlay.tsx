import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, X, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounced } from "../lib/hooks";
import { api } from "../lib/api";
import type { SearchHit } from "../types";
import { Avatar } from "./ui";
import { useStore } from "../lib/store";

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
      return;
    }
    let live = true;
    setLoading(true);
    api<{ quotes: SearchHit[] }>(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then((d) => {
        if (!live) return;
        setHits(d.quotes || []);
      })
      .catch(() => {
        if (!live) return;
        setHits([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [debounced]);

  const term = q.trim();
  const resolveExact = () => {
    if (!term) return "";
    const t = term.toUpperCase();
    const bySym = hits.find((h) => h.symbol.toUpperCase() === t);
    if (bySym) return bySym.symbol;
    const lower = term.toLowerCase();
    const byName = hits.find((h) => (h.longName || h.name || "").toLowerCase() === lower);
    if (byName) return byName.symbol;
    if (!/\s/.test(term)) return t;
    return hits[0]?.symbol || t;
  };
  const exactSymbol = resolveExact();
  const exactHit = hits.find((h) => h.symbol.toUpperCase() === exactSymbol.toUpperCase());
  const related = hits.filter((h) => h.symbol.toUpperCase() !== exactSymbol.toUpperCase());

  const goResults = (query?: string) => {
    const next = (query ?? term).trim();
    if (!next) return;
    if (!/\s/.test(next)) addRecent(next.toUpperCase());
    else if (exactSymbol) addRecent(exactSymbol);
    onClose();
    nav(`/search?q=${encodeURIComponent(next)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    goResults();
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
          <button
            type="submit"
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ background: "var(--ink)", color: "var(--bg)" }}
          >
            Search
          </button>
          <button type="button" onClick={onClose} className="rounded-lg p-2" aria-label="Close search">
            <X size={18} />
          </button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!term && <RecentList onPick={(s) => goResults(s)} />}
          {loading && (
            <div className="px-3 py-4 text-sm" style={{ color: "var(--muted)" }}>
              Searching…
            </div>
          )}
          {term && (
            <div className="mb-3">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Related stocks
              </div>
              <button
                type="button"
                onClick={() => goResults(term)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--bg-2)]"
              >
                <Avatar symbol={exactSymbol || term} logo={exactHit?.logo} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{term}</div>
                  <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                    Open search results
                  </div>
                </div>
              </button>
              {related.map((h) => (
                <button
                  key={h.symbol}
                  type="button"
                  onClick={() => goResults(term)}
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
        </div>
      </div>
    </div>
  );
}
