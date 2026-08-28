import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import type { NewsItem } from "../types";
import { timeAgo } from "../lib/format";
import { ImpactPill } from "./ui";

export function NewsCard({ item, onOpen }: { item: NewsItem; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="card overflow-hidden rise">
      <div className="flex gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
            <span className="font-semibold">{item.publisher}</span>
            <span>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </div>
          <h3 className="mt-1 text-[14.5px] font-semibold leading-snug">{item.title}</h3>
          {(item.description || item.summary?.short) && (
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
              {item.description || item.summary?.short}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ImpactPill impact={item.impact} label={item.impactLabel} />
            {item.related?.[0] && (
              <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
                {item.related[0]}
              </span>
            )}
          </div>
        </div>
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="h-[72px] w-[96px] shrink-0 rounded-xl object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
      <div className="flex items-center gap-2 border-t px-3 py-2" style={{ borderColor: "var(--line)" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold"
          style={{ color: "var(--text)", background: "var(--bg-2)" }}
        >
          <Sparkles size={13} />
          {open ? "Hide summary" : "Summarize"}
        </button>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold"
            style={{ color: "var(--muted)" }}
          >
            Read full article
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      {open && item.summary && (
        <div className="space-y-2 border-t px-3 py-3 text-[13px] leading-relaxed" style={{ borderColor: "var(--line)" }}>
          <p>
            <span className="font-semibold">What happened. </span>
            {item.summary.whatHappened}
          </p>
          <p>
            <span className="font-semibold">Why it matters. </span>
            {item.summary.whyItMatters}
          </p>
          <p>
            <span className="font-semibold">Possible effect. </span>
            {item.summary.businessEffect}
          </p>
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>
            This is not a prediction that the stock will rise or fall.
          </p>
        </div>
      )}
    </article>
  );
}
