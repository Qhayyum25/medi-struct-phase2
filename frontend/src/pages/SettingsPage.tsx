import { useState } from "react";
import {
  ShieldCheck,
  Server,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApiHealth } from "../hooks/useApiHealth";
import { BASE_URL } from "../api/client";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { formatDateTime } from "../lib/format";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const healthy = useApiHealth();
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Workspace Configuration"
        description="Manage your clinical session, inspect backend API endpoints, and review security standards."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ─── Account Card ────────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Clinician Account"
            subtitle="Current authenticated identity"
          />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3.5 pb-2 border-b border-[var(--color-line)]">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-teal-600)] text-white shadow-xs font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase() ?? "U"}
              </span>
              <div>
                <p className="font-semibold text-[14px] text-[var(--color-ink)]">
                  {user?.full_name || user?.email?.split("@")[0] || "Clinician"}
                </p>
                <p className="text-[12px] font-mono text-[var(--color-muted)]">
                  {user?.email ?? "—"}
                </p>
              </div>
            </div>

            <Row label="Role / Permission" value={<Badge tone="brand">{user?.role ?? "Clinician"}</Badge>} />
            <Row label="Enrolled since" value={user ? formatDateTime(user.created_at) : "—"} />
            <Row label="Session Status" value={<span className="text-emerald-600 font-medium">Active (Bearer Token)</span>} />

            <div className="pt-3 border-t border-[var(--color-line)]">
              <Button variant="danger" onClick={logout}>
                <LogOut className="size-3.5" /> Sign out of workspace
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* ─── API Connection Card ─────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Backend Pipeline Engine"
            subtitle="FastAPI clinical extraction services"
          />
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--color-muted)]">API Host</span>
              <div className="flex items-center gap-2">
                <span className="max-w-[220px] truncate font-mono text-[12px] text-[var(--color-ink-soft)] bg-[var(--color-canvas)] px-2.5 py-1 rounded-md border border-[var(--color-line)]">
                  {BASE_URL}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(BASE_URL);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex size-7 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] transition-colors"
                  aria-label="Copy API URL"
                >
                  {copied ? (
                    <Check className="size-3.5 text-teal-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--color-muted)]">
                Health Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                  healthy
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    healthy ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <Server className="size-3" />
                {healthy ? "Healthy & Connected" : "Unreachable"}
              </span>
            </div>

            <Row label="Architecture" value="FastAPI + PyTorch BioBERT + scikit-learn" />
            <Row label="De-identification" value="Pattern-based PHI Redaction + Hash IDs" />
          </CardBody>
        </Card>

        {/* ─── Privacy & Governance Notice ─────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Clinical Privacy & Safety Guarantee"
            subtitle="HIPAA alignment & explainable AI principles"
          />
          <CardBody>
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
                <ShieldCheck className="size-5" />
              </span>
              <div className="space-y-2 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                <p>
                  <strong>Zero PHI Exposure:</strong> Medistruct runs automated de-identification pipelines prior to processing text through clinical NLP models. Patient identities are irreversibly mapped to pseudonymous hashes.
                </p>
                <p className="text-[12px] text-[var(--color-muted)]">
                  <strong>Clinical Decision Support Disclaimer:</strong> Medistruct is an information extraction and knowledge synthesis tool. Extracted entities and relationships are intended for retrospective analysis, clinical trial cohort matching, and documentation efficiency. Medistruct does not diagnose medical conditions or issue clinical prescriptions.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[var(--color-muted)] font-medium">{label}</span>
      <span className="font-semibold text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
