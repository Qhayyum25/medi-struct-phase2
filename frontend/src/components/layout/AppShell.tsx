import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "../../context/AuthContext";
import { MobileNav } from "./MobileNav";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/documents": "Documents",
  "/patients": "Patients",
  "/search": "Search",
  "/analytics": "Analytics",
  "/analytics/association-rules": "Association Rules",
  "/analytics/clustering": "Patient Clustering",
  "/analytics/cohorts": "Cohort Discovery",
  "/settings": "Settings",
};

export function AppShell() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center gap-4">
          {/* Animated logo mark */}
          <svg width="44" height="44" viewBox="0 0 36 36" fill="none" className="animate-pulse">
            <rect width="36" height="36" rx="9" fill="var(--color-brand-900)" />
            <path
              d="M5 18 L9 18 L11 10 L13 26 L15 18 L19 18 L21 14 L23 22 L25 18 L31 18"
              stroke="var(--color-teal-400)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="21" cy="14" r="2.5" fill="var(--color-teal-400)" />
            <circle cx="21" cy="14" r="1.2" fill="white" />
          </svg>
          <p className="text-[13px] text-[var(--color-muted)] font-medium">Loading Medistruct…</p>
        </div>
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const title = TITLES[location.pathname];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 md:pb-0">
          <div
            key={location.pathname}
            className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 page-enter"
          >
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
