import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Search, Settings } from "lucide-react";
import { Mark, Wordmark } from "./components/Logo";
import { BottomNav, NavList } from "./components/Nav";
import { SearchOverlay } from "./components/SearchOverlay";
import { useStore } from "./lib/store";
import { api } from "./lib/api";
import type { NewsItem } from "./types";
import Home from "./pages/Home";
import Stock from "./pages/Stock";
import News from "./pages/News";
import Market from "./pages/Market";
import Watchlist from "./pages/Watchlist";
import SettingsPage from "./pages/Settings";
import ApiKeys from "./pages/ApiKeys";

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { follows, settings, seenNews, markNewsSeen } = useStore();

  useEffect(() => {
    if (!settings.notifications || follows.length === 0) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let cancelled = false;
    let primed = seenNews.length > 0;
    const tick = async () => {
      try {
        const d = await api<{ items: NewsItem[] }>(`/api/news?symbols=${follows.join(",")}&limit=8`);
        if (cancelled) return;
        const ids = (d.items || []).map((n) => n.id).filter(Boolean);
        if (!primed) {
          primed = true;
          markNewsSeen(ids);
          return;
        }
        const fresh = (d.items || []).filter(
          (n) => n.id && !seenNews.includes(n.id) && n.impact && n.impact !== "neutral"
        );
        if (!fresh.length) return;
        const top = fresh[0];
        new Notification(`${top.related?.[0] || "My Stock Analyzer"} news`, {
          body: top.title,
        });
        markNewsSeen(fresh.map((n) => n.id));
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(tick, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [follows, settings.notifications, seenNews, markNewsSeen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "var(--bg)" }}>
      <SideNavBrand onSearch={() => setSearchOpen(true)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className="flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5 md:gap-3 md:px-8 md:py-3"
          style={{
            background: "color-mix(in srgb, var(--surface) 92%, transparent)",
            borderColor: "var(--line)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="shrink-0 md:hidden" aria-label="My Stock Analyzer">
            <Mark size={28} />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="card flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left md:max-w-xl md:gap-3 md:px-3.5 md:py-2.5"
          >
            <Search size={16} className="shrink-0" style={{ color: "var(--muted)" }} />
            <span className="truncate text-sm" style={{ color: "var(--muted)" }}>
              Search stock or company
            </span>
          </button>
          <Link
            to="/settings"
            className="hidden shrink-0 rounded-xl p-2 md:inline-flex"
            style={{ color: "var(--muted)" }}
            aria-label="Settings"
          >
            <Settings size={18} />
          </Link>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-3 md:px-8 md:pb-10">
            <Routes>
              <Route path="/" element={<Home onSearch={() => setSearchOpen(true)} />} />
              <Route path="/market" element={<Market />} />
              <Route path="/news" element={<News />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/api-keys" element={<ApiKeys />} />
              <Route path="/stock/:symbol" element={<Stock />} />
            </Routes>
          </div>
        </main>
        <div
          className="shrink-0 md:hidden"
          style={{ height: "calc(3.55rem + env(safe-area-inset-bottom))" }}
          aria-hidden
        />
      </div>
      <BottomNav />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SideNavBrand({ onSearch }: { onSearch: () => void }) {
  return (
    <aside
      className="hidden h-full w-[220px] shrink-0 flex-col overflow-y-auto border-r md:flex lg:w-[240px]"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <div className="px-5 pb-4 pt-6">
        <Wordmark />
      </div>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onSearch}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
          style={{ color: "var(--muted)" }}
        >
          <Search size={18} />
          Search
        </button>
      </div>
      <div className="px-2">
        <NavList />
      </div>
      <div className="mt-auto px-5 pb-6 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Smart Metrics. Real-Time Insights.
        <div className="mt-1">Not financial advice.</div>
      </div>
    </aside>
  );
}
