import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AppShell } from "./components/layout/AppShell";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/DashboardPage";

// Route-level code splitting: everything past the dashboard loads on demand.
const DocumentsPage = lazy(() => import("./pages/documents/DocumentsPage"));
const DocumentDetailPage = lazy(() => import("./pages/documents/DocumentDetailPage"));
const PatientsPage = lazy(() => import("./pages/patients/PatientsPage"));
const PatientDetailPage = lazy(() => import("./pages/patients/PatientDetailPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const AssociationRulesPage = lazy(() => import("./pages/analytics/AssociationRulesPage"));
const ClusteringPage = lazy(() => import("./pages/analytics/ClusteringPage"));
const CohortDiscoveryPage = lazy(() => import("./pages/analytics/CohortDiscoveryPage"));
const AnalyticsLandingPage = lazy(() => import("./pages/analytics/AnalyticsLandingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function RouteFallback() {
  return <div className="py-16 text-center text-[13px] text-muted">Loading…</div>;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/documents" element={<Suspense fallback={<RouteFallback />}><DocumentsPage /></Suspense>} />
                <Route path="/documents/:id" element={<Suspense fallback={<RouteFallback />}><DocumentDetailPage /></Suspense>} />
                <Route path="/patients" element={<Suspense fallback={<RouteFallback />}><PatientsPage /></Suspense>} />
                <Route path="/patients/:id" element={<Suspense fallback={<RouteFallback />}><PatientDetailPage /></Suspense>} />
                <Route path="/search" element={<Suspense fallback={<RouteFallback />}><SearchPage /></Suspense>} />
                <Route path="/analytics" element={<Suspense fallback={<RouteFallback />}><AnalyticsLandingPage /></Suspense>} />
                <Route path="/analytics/association-rules" element={<Suspense fallback={<RouteFallback />}><AssociationRulesPage /></Suspense>} />
                <Route path="/analytics/clustering" element={<Suspense fallback={<RouteFallback />}><ClusteringPage /></Suspense>} />
                <Route path="/analytics/cohorts" element={<Suspense fallback={<RouteFallback />}><CohortDiscoveryPage /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={<RouteFallback />}><SettingsPage /></Suspense>} />
                <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
