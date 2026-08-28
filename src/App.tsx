import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
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
import Settings from "./pages/Settings";

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
        new Notification(`${top.related?.[0] || "StockLens"} news`, {
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
      <div className="mx-auto flex max-w-[1180px]">
        <SideNavBrand />
        <div className="min-w-0 flex-1">
          {!hideTop && (
            <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 lg:hidden" style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(12px)" }}>
              <Wordmark compact />
            </header>
          )}
          <main className="mx-auto min-h-screen max-w-reading px-4 pb-24 pt-1 lg:pb-10 lg:pt-6">
            <Routes>
              <Route path="/" element={<Home onSearch={() => setSearchOpen(true)} />} />
              <Route path="/market" element={<Market />} />
              <Route path="/news" element={<News />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/settings" element={<Settings />} />
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

function SideNavBrand() {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r lg:flex"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <div className="px-5 pb-4 pt-6">
        <Wordmark />
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
