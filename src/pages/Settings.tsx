import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../lib/store";
import { useMoney } from "../lib/money";
import { CURRENCIES } from "../lib/aiProviders";
import { Wordmark } from "../components/Logo";

export default function Settings() {
  const { settings, updateSettings, aiVault } = useStore();
  const money = useMoney();
  const [page, setPage] = useState<"main" | "about" | "privacy" | "terms">("main");

  if (page === "about") return <Legal title="About" onBack={() => setPage("main")}><About /></Legal>;
  if (page === "privacy") return <Legal title="Privacy" onBack={() => setPage("main")}><Privacy /></Legal>;
  if (page === "terms") return <Legal title="Terms" onBack={() => setPage("main")}><Terms /></Legal>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Settings</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Preferences stay on this device. No account is required.
        </p>
      </div>

      <section className="card divide-y overflow-hidden" style={{ borderColor: "var(--line)" }}>
        <Toggle
          label="Dark mode"
          hint="Use a darker canvas at night"
          on={settings.darkMode}
          onChange={(v) => updateSettings({ darkMode: v })}
        />
        <Toggle
          label="Notifications"
          hint="Ask this browser to alert you about followed names"
          on={settings.notifications}
          onChange={async (v) => {
            if (v && "Notification" in window) {
              const perm = await Notification.requestPermission();
              updateSettings({ notifications: perm === "granted" });
            } else {
              updateSettings({ notifications: false });
            }
          }}
        />
      </section>

      <section className="card p-4">
        <div className="text-sm font-semibold">News preferences</div>
        <p className="mb-3 text-[12px]" style={{ color: "var(--muted)" }}>
          Highlight these topics when you read the feed. Choose All to keep every headline.
        </p>
        <div className="flex flex-wrap gap-2">
          {["all", "earnings", "products", "technology", "management", "regulation", "analyst", "ma", "partnerships"].map((id) => {
            const on = settings.newsCategories.includes(id) || (id === "all" && settings.newsCategories.includes("all"));
            const labels: Record<string, string> = {
              all: "All",
              earnings: "Earnings",
              products: "Products",
              technology: "Technology",
              management: "Management",
              regulation: "Regulation",
              analyst: "Analyst",
              ma: "M&A",
              partnerships: "Partnerships",
            };
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === "all") updateSettings({ newsCategories: ["all"] });
                  else {
                    const next = settings.newsCategories.filter((x) => x !== "all");
                    updateSettings({
                      newsCategories: next.includes(id) ? next.filter((x) => x !== id) : [...next, id],
                    });
                  }
                }}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
                style={
                  on
                    ? { background: "var(--ink)", color: "var(--bg)" }
                    : { background: "var(--bg-2)", color: "var(--muted)", border: "1px solid var(--line)" }
                }
              >
                {labels[id]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <div>
          <div className="text-sm font-semibold">Default market</div>
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            Version 1 focuses on US-listed stocks.
          </div>
          <select
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
            value={settings.defaultMarket}
            onChange={(e) => updateSettings({ defaultMarket: e.target.value })}
          >
            <option value="US">United States</option>
          </select>
        </div>
        <div>
          <div className="text-sm font-semibold">Display currency</div>
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            Quotes are sourced in USD and converted across the app using live FX rates.
          </div>
          <select
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text)" }}
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.label}
              </option>
            ))}
          </select>
          {money.converted && (
            <div className="mt-2 text-[12px]" style={{ color: "var(--muted)" }}>
              1 USD ≈ {money.rate.toLocaleString("en-US", { maximumFractionDigits: 4 })} {money.code}
            </div>
          )}
        </div>
      </section>

      <section className="card overflow-hidden text-sm">
        <Link to="/settings/api-keys" className="flex w-full items-center justify-between px-4 py-3 text-left font-medium">
          <div>
            <div>API keys</div>
            <div className="text-[12px] font-normal" style={{ color: "var(--muted)" }}>
              {aiVault.keys.length
                ? `${aiVault.keys.length} saved on this device`
                : "Add keys for OpenAI, Claude, Gemini and more"}
            </div>
          </div>
          <span style={{ color: "var(--muted)" }}>›</span>
        </Link>
      </section>

      <section className="card divide-y overflow-hidden text-sm">
        <Row label="About" onClick={() => setPage("about")} />
        <Row label="Privacy" onClick={() => setPage("privacy")} />
        <Row label="Terms" onClick={() => setPage("terms")} />
      </section>

      <p className="px-1 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
        My Stock Analyzer Version 1.0 · Favourites, Follows and settings are stored locally. Uninstalling the app or changing
        devices may clear them. Cloud sync is designed for a later version.
      </p>
    </div>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[12px]" style={{ color: "var(--muted)" }}>
          {hint}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className="relative h-6 w-11 rounded-full"
        style={{ background: on ? "#1f8df9" : "var(--line)" }}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition" style={{ left: on ? 22 : 2 }} />
      </button>
    </label>
  );
}

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between px-4 py-3 text-left font-medium">
      {label}
      <span style={{ color: "var(--muted)" }}>›</span>
    </button>
  );
}

function Legal({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold">
        <ArrowLeft size={16} /> Settings
      </button>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight">{title}</h1>
      <div className="card space-y-3 p-4 text-[14px] leading-relaxed">{children}</div>
    </div>
  );
}

function About() {
  return (
    <>
      <Wordmark />
      <p className="font-medium">Smart Metrics. Real-Time Insights.</p>
      <p>
        My Stock Analyzer is a research app for beginner and intermediate investors. It is built to answer three questions: what
        is happening, how good is this company, and is the stock interesting at this price.
      </p>
      <p>Version 1.0.0 · No login required.</p>
      <p style={{ color: "var(--muted)" }}>Market data is delayed or last-sale and may be incomplete. Not financial advice.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>
        Version 1 does not create accounts. Favourite lists, Follow lists, recent searches, settings and optional AI API
        keys are stored in this browser’s local storage. Keys are sent to the analysis server only when you run Analyze
        This Stock, and they are not written to logs.
      </p>
      <p>
        If you enable notifications, the browser permission is requested on this device only. Uninstalling, clearing
        site data, or switching devices may erase local preferences.
      </p>
      <p>
        Market quotes, filings and headlines are requested from public data sources in order to display the product.
        My Stock Analyzer does not sell personal information.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <p>
        My Stock Analyzer is an informational research tool. Nothing in the app is an offer, solicitation, or recommendation to
        buy or sell any security.
      </p>
      <p>
        Automated scores, checklists and news labels are generated from public data and simple rules. They can be wrong,
        incomplete, or out of date. Always read original filings and articles.
      </p>
      <p>You are responsible for your own investment decisions.</p>
    </>
  );
}
