import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileStack,
  Users,
  Search,
  LineChart,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { cn } from "../../lib/cn";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/documents", label: "Documents", icon: FileStack },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/search", label: "Search", icon: Search },
  { to: "/analytics", label: "Analytics", icon: LineChart },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none border-r border-white/[0.08] bg-[#070B14]",
        collapsed ? "w-[72px]" : "w-[230px]"
      )}
      style={{ boxShadow: "4px 0 25px rgba(0,0,0,0.5)" }}
    >
      {/* Top Header Logo matching Image 2 */}
      <div className="flex h-16 items-center px-4.5 border-b border-white/[0.08] justify-between">
        <Logo compact={collapsed} />
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {/* Main Navigation matching Image 2 vertical icon rail */}
      <div className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {NAV.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[13px] font-semibold transition-all duration-150",
                isActive
                  ? "bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/25 shadow-[0_0_15px_rgba(0,229,153,0.15)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
              )}
            >
              <item.icon
                className={cn(
                  "size-5 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-[#00E599]" : "text-slate-400 group-hover:text-white"
                )}
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <span className="ml-auto size-1.5 rounded-full bg-[#00E599] shadow-[0_0_8px_#00E599]" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Settings & Status */}
      <div className="p-3 border-t border-white/[0.08] space-y-1">
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors text-slate-400 hover:bg-white/[0.04] hover:text-white"
          )}
        >
          <Settings className="size-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex size-10 w-full items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.04] hover:text-white transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="size-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
