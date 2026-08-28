import { Star } from "lucide-react";
import { useStore } from "../lib/store";

export function StarButton({ symbol, size = 18, withLabel = false }: { symbol: string; size?: number; withLabel?: boolean }) {
  const { isFavourite, toggleFavourite } = useStore();
  const on = isFavourite(symbol);
  return (
    <button
      type="button"
      aria-label={on ? "Remove from Favourite" : "Add to Favourite"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavourite(symbol);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg p-1.5 active:scale-95"
      style={{ color: on ? "#C9A227" : "var(--muted)" }}
    >
      <Star size={size} fill={on ? "#C9A227" : "none"} strokeWidth={1.8} />
      {withLabel && <span className="text-sm font-semibold">{on ? "Favourited" : "Favourite"}</span>}
    </button>
  );
}
