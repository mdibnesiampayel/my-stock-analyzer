import type { ReactNode } from "react";
import { changeTone, formatPct } from "../lib/format";

export function ChangeBadge({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  const tone = changeTone(value);
  const cls = tone === "pos" ? "badge-pos" : tone === "neg" ? "badge-neg" : "badge-flat";
  return (
    <span className={`price inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${cls} ${className}`}>
      {formatPct(value)}
    </span>
  );
}

export function Avatar({ symbol, logo, size = 36 }: { symbol: string; logo?: string; size?: number }) {
  const letter = (symbol || "?").slice(0, 1).toUpperCase();
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl bg-[#e8edf3] dark:bg-[#1d2733]"
      style={{ width: size, height: size }}
    >
      <div
        className="flex h-full w-full items-center justify-center text-xs font-bold"
        style={{ color: "var(--muted)" }}
      >
        {letter}
      </div>
      {logo && (
        <img
          src={logo}
          alt=""
          className="absolute inset-0 h-full w-full object-contain bg-white p-0.5"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}

export function Sparkline({ data, positive, width = 72, height = 28 }: { data?: number[]; positive?: boolean; width?: number; height?: number }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = positive === false ? "#dd7a2b" : "#1f8df9";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skel rounded-lg ${className}`} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--bg-2)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 3l2.2 6.4H21l-5.4 3.9 2.1 6.4L12 16.8 6.3 19.7l2.1-6.4L3 9.4h6.8L12 3z" />
        </svg>
      </div>
      <div className="text-[15px] font-semibold">{title}</div>
      {body && (
        <p className="mx-auto mt-1 max-w-xs text-sm" style={{ color: "var(--muted)" }}>
          {body}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
      {children}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card px-4 py-5 text-sm">
      <div className="font-medium">Could not load this data</div>
      <p className="mt-1" style={{ color: "var(--muted)" }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: "var(--ink)" }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function RatingDot({ rating }: { rating: "good" | "watch" | "risk" }) {
  const map = {
    good: { bg: "#D1FAE5", fg: "#047857", label: "Good" },
    watch: { bg: "#FEF3C7", fg: "#B45309", label: "Needs Attention" },
    risk: { bg: "#FEE2E2", fg: "#B91C1C", label: "Risk" },
  } as const;
  const m = map[rating];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: m.bg, color: m.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.fg }} />
      {m.label}
    </span>
  );
}

export function ImpactPill({ impact, label }: { impact?: string; label?: string }) {
  const tone =
    impact === "positive"
      ? { bg: "#DBEAFE", fg: "#1D4ED8" }
      : impact === "negative"
        ? { bg: "#FFEDD5", fg: "#C2410C" }
        : { bg: "#F2F4F7", fg: "#475467" };
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: tone.bg, color: tone.fg }}>
      {label || "Neutral / Unclear"}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98] ${className}`}
      style={{ background: "var(--ink)" }}
    >
      {children}
    </button>
  );
}

export function ScoreRing({ score, size = 92 }: { score: number; size?: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? "#1f8df9" : pct >= 60 ? "#0EA5E9" : pct >= 45 ? "#dd7a2b" : "#b42318";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90">
        <circle cx="46" cy="46" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="price text-xl font-bold leading-none">{score}</div>
        <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          / 100
        </div>
      </div>
    </div>
  );
}

export function YearBars({
  data,
  color = "#1f8df9",
}: {
  data: { year?: number; end?: string; value: number }[];
  color?: string;
}) {
  if (!data?.length) return <div className="text-xs" style={{ color: "var(--muted)" }}>No history yet</div>;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => {
        const h = Math.max(4, (Math.abs(d.value) / max) * 88);
        const negative = d.value < 0;
        const label = d.year || (d.end ? d.end.slice(0, 4) : "");
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md"
              style={{ height: h, background: negative ? "#dd7a2b" : color, opacity: 0.55 + (i / data.length) * 0.45 }}
            />
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>
              {String(label).slice(-2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
