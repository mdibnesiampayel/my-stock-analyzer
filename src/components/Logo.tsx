export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#102033" />
      <circle cx="14" cy="14" r="6.5" stroke="#1f8df9" strokeWidth="2" />
      <path d="M19 19L25 25" stroke="#1f8df9" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M11 16.5L13.2 13.8L15.1 15.4L17.6 11.5"
        stroke="#F3F5F7"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Mark size={compact ? 26 : 30} />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[13px] font-semibold tracking-tight sm:text-[15px]" style={{ color: "var(--text)" }}>
          My Stock Analyzer
        </div>
        {!compact && (
          <div className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            Smart Metrics
          </div>
        )}
      </div>
    </div>
  );
}
