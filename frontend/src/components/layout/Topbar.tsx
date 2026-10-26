import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  LogOut,
  User,
  ChevronDown,
  Bell,
  Plus,
  Sparkles,
  Bookmark,
  Compass,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApiHealth } from "../../hooks/useApiHealth";

export function Topbar({ title: _title }: { title?: string }) {
  const { user, logout } = useAuth();
  const healthy = useApiHealth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navPill, setNavPill] = useState("study");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#070B14]/85 px-6 backdrop-blur-xl">
      {/* ─── Center Nav Tabs matching Image 1 ───────────────────────── */}
      <div className="flex items-center gap-2">
        <Link
          to="/documents"
          className="flex items-center gap-1.5 rounded-full bg-[#00E599]/15 border border-[#00E599]/30 px-3.5 py-1.5 text-[12px] font-bold text-[#00E599] shadow-[0_0_15px_rgba(0,229,153,0.2)] hover:bg-[#00E599]/25 transition-all"
        >
          <Plus className="size-3.5" />
          <span>New Study</span>
        </Link>

        <button
          onClick={() => setNavPill("recommended")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all cursor-pointer ${
            navPill === "recommended"
              ? "text-white bg-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="size-3.5" />
          <span>Recommended</span>
        </button>

        <button
          onClick={() => setNavPill("favorites")}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all cursor-pointer ${
            navPill === "favorites"
              ? "text-white bg-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Bookmark className="size-3.5" />
          <span>Favorites</span>
        </button>

        <Link
          to="/search"
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Compass className="size-3.5" />
          <span>Discover</span>
        </Link>
      </div>

      {/* ─── Search Bar & Profile matching Image 1 ──────────────────── */}
      <div className="flex items-center gap-4">
        {/* Search for Target / Clinical input matching Image 1 */}
        <div
          onClick={() => navigate("/search")}
          className="group flex h-9.5 w-64 items-center justify-between rounded-full border border-white/10 bg-[#0E1524] px-3.5 text-[13px] text-slate-400 transition-all hover:border-[#00E599]/40 hover:bg-[#121B2E] cursor-pointer"
        >
          <span className="truncate">Search for Target, Drug...</span>
          <Search className="size-4 text-slate-400 group-hover:text-[#00E599] transition-colors" />
        </div>

        {/* Notification Bell */}
        <button
          className="relative flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#0E1524] text-slate-400 hover:text-white hover:border-white/20 transition-colors"
          title="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-[#00E599] shadow-[0_0_6px_#00E599]" />
        </button>

        {/* User Profile Pill matching Image 1 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 rounded-full border border-white/10 bg-[#0E1524] p-1 pr-3 text-left hover:border-white/20 transition-all cursor-pointer"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#00E599] to-[#00F2FE] text-[#05080E] font-bold text-[12px]">
              {user?.full_name?.charAt(0) || "D"}
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-white leading-tight">
                {user?.full_name || "Dr. Sarah Connor"}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                Primary care physician
              </span>
            </div>
            <ChevronDown className="size-3.5 text-slate-400" />
          </button>

          {/* Account Dropdown */}
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-[#0B101B] p-2 shadow-2xl backdrop-blur-2xl"
              style={{ animation: "scale-in 150ms ease both" }}
            >
              <div className="px-3 py-2 border-b border-white/[0.08]">
                <p className="text-[12px] font-bold text-white">
                  {user?.full_name || "Dr. Sarah Connor"}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#00E599]/10 px-2 py-0.5 text-[10px] font-bold text-[#00E599]">
                  {healthy ? "Live API Connected" : "Local Mode"}
                </span>
              </div>

              <div className="mt-1 space-y-0.5">
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                >
                  <User className="size-3.5" /> Workspace Settings
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="size-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
