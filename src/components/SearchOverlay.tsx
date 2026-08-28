import { useEffect, useMemo, useRef, useState } from "react";
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

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(q, 200);
  const input = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const { recent, addRecent } = useStore();

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
        if (live) setHits(d.quotes || []);
      })
      .catch(() => {
        if (live) setHits([]);
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

  const recentHits = useMemo(() => recent.slice(0, 6), [recent]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-3 pt-[8vh] backdrop-blur-[2px]">
      <div className="card w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--line)" }}>
          <Search size={18} style={{ color: "var(--muted)" }} />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stock or company"
            className="h-11 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button type="button" onClick={onClose} className="rounded-lg p-2" aria-label="Close search">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!q && recentHits.length > 0 && (
            <div className="px-2 pb-2">
              <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                <Clock size={12} /> Recent
              </div>
              {recentHits.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => go(s)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[var(--bg-2)]"
                >
                  <Avatar symbol={s} logo={`https://storage.googleapis.com/iex/api/logos/${s}.png`} size={32} />
                  <span className="text-sm font-semibold">{s}</span>
                </button>
              ))}
            </div>
          )}
          {loading && <div className="px-3 py-4 text-sm" style={{ color: "var(--muted)" }}>Searching…</div>}
          {!loading && q && hits.length === 0 && (
            <div className="px-3 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No matching companies for “{q}”.
            </div>
          )}
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
      </div>
    </div>
  );
}
