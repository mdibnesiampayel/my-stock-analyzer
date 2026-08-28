import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Search, Settings } from "lucide-react";
import { Wordmark } from "./components/Logo";
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
  const loc = useLocation();
  const hideTop = loc.pathname.startsWith("/stock/");
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <SideNavBrand onSearch={() => setSearchOpen(true)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={`sticky top-0 z-20 items-center gap-3 px-4 py-3 lg:flex lg:px-8 ${hideTop ? "hidden" : "flex"}`}
            style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(12px)" }}
          >
            {!hideTop && (
              <div className="lg:hidden">
                <Wordmark compact />
              </div>
            )}
            <div className="hidden min-w-0 flex-1 lg:block">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="card flex w-full max-w-xl items-center gap-3 px-3.5 py-2.5 text-left"
              >
                <Search size={16} style={{ color: "var(--muted)" }} />
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  Search stock or company
                </span>
              </button>
            </div>
            <Link
              to="/settings"
              className="ml-auto hidden rounded-xl p-2 lg:inline-flex"
              style={{ color: "var(--muted)" }}
              aria-label="Settings"
            >
              <Settings size={18} />
            </Link>
          </header>
          <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-24 pt-1 lg:px-8 lg:pb-10">
            <Routes>
              <Route path="/" element={<Home onSearch={() => setSearchOpen(true)} />} />
              <Route path="/market" element={<Market />} />
              <Route path="/news" element={<News />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/api-keys" element={<ApiKeys />} />
              <Route path="/stock/:symbol" element={<Stock />} />
            </Routes>
          </main>
        </div>
      </div>
      <BottomNav />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SideNavBrand({ onSearch }: { onSearch: () => void }) {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r lg:flex"
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
