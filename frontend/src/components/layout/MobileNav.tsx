import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileStack, Users, Search, LineChart } from "lucide-react";
import { cn } from "../../lib/cn";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/documents", label: "Docs", icon: FileStack },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/search", label: "Search", icon: Search },
  { to: "/analytics", label: "Analytics", icon: LineChart },
];

export function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-[var(--color-line)] bg-[var(--color-surface)]"
      style={{ boxShadow: "0 -4px 16px rgba(13, 22, 37, 0.08)" }}
    >
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              isActive
                ? "text-[var(--color-brand-500)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink-soft)]",
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn("size-5", isActive ? "text-[var(--color-brand-500)]" : "")} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[var(--color-brand-500)]" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
