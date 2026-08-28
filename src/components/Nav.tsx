import { NavLink } from "react-router-dom";
import { Home, LineChart, Newspaper, Star, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t lg:hidden"
      style={{
        background: "color-mix(in srgb, var(--surface) 92%, transparent)",
        borderColor: "var(--line)",
        backdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto grid max-w-reading grid-cols-5 px-1 pt-1.5 pb-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-medium ${isActive ? "" : "opacity-60"}`
            }
            style={({ isActive }) => ({ color: isActive ? "var(--text)" : "var(--muted)" })}
          >
            {({ isActive }) => (
              <>
                <it.icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                {it.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function SideNav() {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r px-4 py-5 md:flex"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <NavList />
    </aside>
  );
}

export function NavList() {
  return (
    <div className="flex flex-col gap-1">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
          style={({ isActive }) => ({
            background: isActive ? "var(--bg-2)" : "transparent",
            color: isActive ? "var(--text)" : "var(--muted)",
          })}
        >
          <it.icon size={18} />
          {it.label}
        </NavLink>
      ))}
    </div>
  );
}
