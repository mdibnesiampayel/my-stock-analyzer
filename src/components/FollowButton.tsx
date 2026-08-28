import { Bell, BellOff } from "lucide-react";
import { useStore } from "../lib/store";

export function FollowButton({ symbol }: { symbol: string }) {
  const { isFollowed, toggleFollow } = useStore();
  const on = isFollowed(symbol);
  return (
    <button
      type="button"
      onClick={() => toggleFollow(symbol)}
      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold active:scale-[0.98]"
      style={
        on
          ? { background: "var(--ink)", color: "var(--bg)" }
          : { background: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--line)" }
      }
    >
      {on ? <Bell size={15} /> : <BellOff size={15} />}
      {on ? "Following" : "Follow"}
    </button>
  );
}
