import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  PlayCircle,
  FileText,
  Dna,
  GitBranch,
  Users,
  Calendar,
  HardDrive,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { documentsApi } from "../../api/documents";
import { entitiesApi } from "../../api/entities";
import { relationsApi } from "../../api/relations";
import { Card, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EntityBadge } from "../../components/ui/EntityBadge";
import { ConfidenceMeter } from "../../components/ui/ConfidenceMeter";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { SkeletonRows, Skeleton } from "../../components/ui/Skeleton";
import { EntityText } from "../../components/domain/EntityText";
import { RelationGraph } from "../../components/domain/RelationGraph";
import { ConfirmDialog } from "../../components/domain/ConfirmDialog";
import { formatBytes, formatDateTime, titleCase } from "../../lib/format";
import { describeError } from "../../lib/errors";
import { useToast } from "../../context/ToastContext";

type TabKey = "entities" | "text" | "relations" | "raw";

export default function DocumentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("entities");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [entityFilter, setEntityFilter] = useState("");

  const docQuery = useQuery({
    queryKey: ["document", id],
    queryFn: () => documentsApi.get(id, true),
  });

  const entitiesQuery = useQuery({
    queryKey: ["document", id, "entities"],
    queryFn: () => entitiesApi.forDocument(id, { page_size: 100 }),
    enabled: !!docQuery.data && docQuery.data.entity_count > 0,
  });

  const relationsQuery = useQuery({
    queryKey: ["document", id, "relations"],
    queryFn: () => relationsApi.forDocument(id, { page_size: 100 }),
    enabled: !!docQuery.data && docQuery.data.relation_count > 0,
  });

  const processMutation = useMutation({
    mutationFn: () => documentsApi.process(id),
    onSuccess: () => {
      toast("Clinical NLP pipeline executed successfully.", "success");
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["document", id, "entities"] });
      qc.invalidateQueries({ queryKey: ["document", id, "relations"] });
    },
    onError: (err) => toast(describeError(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentsApi.remove(id),
    onSuccess: () => {
      toast("Document deleted.", "success");
      navigate("/documents");
    },
    onError: (err) => {
      toast(describeError(err), "error");
      setConfirmDelete(false);
    },
  });

  if (docQuery.isLoading) return <DetailSkeleton />;
  if (docQuery.isError || !docQuery.data) {
    return (
      <ErrorState
        message="Unable to load this clinical document."
        onRetry={() => docQuery.refetch()}
      />
    );
  }

  const doc = docQuery.data;
  const entities = entitiesQuery.data?.items ?? [];
  const relations = relationsQuery.data?.items ?? [];

  const filteredEntities = entityFilter
    ? entities.filter(
        (e) =>
          e.entity_text.toLowerCase().includes(entityFilter.toLowerCase()) ||
          e.entity_type.toLowerCase().includes(entityFilter.toLowerCase())
      )
    : entities;

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb Back Link ──────────────────────────────────── */}
      <div>
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to documents
        </Link>
      </div>

      {/* ─── Document Header ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-xl font-bold tracking-tight text-[var(--color-ink)] sm:text-2xl">
              {doc.filename}
            </h1>
            <StatusBadge status={doc.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--color-muted)]">
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="size-3.5" /> {formatBytes(doc.file_size)}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5" /> Ingested {formatDateTime(doc.created_at)}
            </span>
            {doc.patient_id && (
              <Link
                to={`/patients/${doc.patient_id}`}
                className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline"
              >
                <Users className="size-3.5" /> Patient Record <ExternalLink className="size-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            loading={processMutation.isPending}
            onClick={() => processMutation.mutate()}
          >
            <PlayCircle className="size-4 text-[var(--color-brand-600)]" />
            {doc.status === "completed" ? "Re-run Pipeline" : "Execute Pipeline"}
          </Button>
          <Button
            variant="danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Error alert if processing failed */}
      {doc.status === "failed" && doc.error_message && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-[13px] text-rose-700">
          <p className="font-semibold">Pipeline Extraction Error</p>
          <p className="mt-1 text-[12px]">{doc.error_message}</p>
        </div>
      )}

      {/* ─── Metric Tiles ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile
          icon={Dna}
          label="Entities Extracted"
          value={doc.entity_count}
          tone="brand"
        />
        <StatTile
          icon={GitBranch}
          label="Relations Discovered"
          value={doc.relation_count}
          tone="violet"
        />
        <StatTile
          icon={FileText}
          label="File Format"
          value={doc.file_type.toUpperCase()}
          mono
          tone="teal"
        />
        <StatTile
          icon={Calendar}
          label="Last Processed"
          value={formatDateTime(doc.updated_at)}
          small
          tone="slate"
        />
      </div>

      {/* ─── Content Tabs Card ────────────────────────────────────── */}
      <Card>
        <Tabs
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
          tabs={[
            { key: "entities", label: "Entities Table", count: doc.entity_count },
            { key: "text", label: "De-identified Reading View" },
            { key: "relations", label: "Relations & Graph", count: doc.relation_count },
            { key: "raw", label: "Raw JSON Payload" },
          ]}
        />

        <CardBody className="p-6">
          {/* TAB: ENTITIES */}
          {tab === "entities" && (
            <div>
              {entitiesQuery.isLoading ? (
                <SkeletonRows rows={6} />
              ) : entities.length === 0 ? (
                <EmptyState
                  icon={Dna}
                  title="No entities extracted"
                  description="Run the clinical NLP pipeline to identify biomedical entities and concept codes."
                  action={
                    <Button
                      variant="primary"
                      loading={processMutation.isPending}
                      onClick={() => processMutation.mutate()}
                    >
                      <PlayCircle className="size-3.5" /> Run pipeline
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {/* Entity search filter bar */}
                  <div className="flex items-center justify-between gap-4">
                    <input
                      type="text"
                      placeholder="Filter entities by text or concept type..."
                      value={entityFilter}
                      onChange={(e) => setEntityFilter(e.target.value)}
                      className="h-9 w-72 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-brand-500)] focus:outline-hidden"
                    />
                    <span className="text-[12px] text-[var(--color-muted)] font-mono">
                      Showing {filteredEntities.length} of {entities.length} concepts
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-line)]">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                          <th className="px-5 py-3">Mentioned Text</th>
                          <th className="px-5 py-3">Entity Category</th>
                          <th className="px-5 py-3">Model Confidence</th>
                          <th className="px-5 py-3">Character Offset</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-line)]">
                        {filteredEntities.map((e) => (
                          <tr
                            key={e.id}
                            className="group transition-colors hover:bg-[var(--color-canvas)]"
                          >
                            <td className="px-5 py-3 font-semibold text-[var(--color-ink)]">
                              {e.entity_text}
                            </td>
                            <td className="px-5 py-3">
                              <EntityBadge type={e.entity_type} />
                            </td>
                            <td className="px-5 py-3">
                              <ConfidenceMeter value={e.confidence} />
                            </td>
                            <td className="px-5 py-3 font-mono text-[12px] tabular text-[var(--color-muted)]">
                              [{e.start_position} : {e.end_position}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: DE-IDENTIFIED TEXT */}
          {tab === "text" && (
            <div>
              {doc.deidentified_text ? (
                entitiesQuery.isLoading ? (
                  <SkeletonRows rows={5} />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-2.5 text-[12px] text-[var(--color-muted)]">
                      <span className="flex items-center gap-1.5 font-medium text-[var(--color-ink-soft)]">
                        <Sparkles className="size-3.5 text-teal-600" />
                        Click on any highlighted clinical entity to inspect model confidence and extraction metadata.
                      </span>
                      <span className="font-mono text-[11px]">{entities.length} highlighted</span>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-8 shadow-inner">
                      <EntityText text={doc.deidentified_text} entities={entities} />
                    </div>
                  </div>
                )
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No de-identified text available"
                  description="Run the clinical NLP pipeline to anonymize and annotate this document."
                  action={
                    <Button
                      variant="primary"
                      loading={processMutation.isPending}
                      onClick={() => processMutation.mutate()}
                    >
                      <PlayCircle className="size-3.5" /> Run pipeline
                    </Button>
                  }
                />
              )}
            </div>
          )}

          {/* TAB: RELATIONS */}
          {tab === "relations" && (
            <div>
              {relationsQuery.isLoading ? (
                <SkeletonRows rows={5} />
              ) : relations.length === 0 ? (
                <EmptyState
                  icon={GitBranch}
                  title="No clinical relationships discovered"
                  description="Extract entity assertions (e.g. Medication treats Disease, Symptom indicates Condition) by executing the pipeline."
                  action={
                    <Button
                      variant="primary"
                      loading={processMutation.isPending}
                      onClick={() => processMutation.mutate()}
                    >
                      <PlayCircle className="size-3.5" /> Run pipeline
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-6">
                  <RelationGraph relations={relations} />

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-line)]">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                          <th className="px-5 py-3">Subject Entity</th>
                          <th className="px-5 py-3">Predicate / Relation</th>
                          <th className="px-5 py-3">Object Entity</th>
                          <th className="px-5 py-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-line)]">
                        {relations.map((r) => (
                          <tr
                            key={r.id}
                            className="group transition-colors hover:bg-[var(--color-canvas)]"
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <EntityBadge type={r.subject_entity.entity_type} />
                                <span className="font-semibold text-[var(--color-ink)]">
                                  {r.subject_entity.entity_text}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-semibold text-[var(--color-brand-600)]">
                              {titleCase(r.relation_type)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <EntityBadge type={r.object_entity.entity_type} />
                                <span className="font-semibold text-[var(--color-ink)]">
                                  {r.object_entity.entity_text}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <ConfidenceMeter value={r.confidence} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: RAW JSON */}
          {tab === "raw" && (
            <div className="space-y-6">
              <RawBlock title="Document Record" data={doc} />
              <RawBlock title="Extracted Entities" data={entities} />
              <RawBlock title="Extracted Relations" data={relations} />
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete clinical document"
        description="This will permanently delete this document and all entities, relationships, and observations extracted from it. This cannot be undone."
        confirmLabel="Delete document"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  mono,
  small,
  tone = "brand",
}: {
  icon: typeof Dna;
  label: string;
  value: string | number;
  mono?: boolean;
  small?: boolean;
  tone?: "brand" | "teal" | "violet" | "slate";
}) {
  const iconColors = {
    brand: "text-[var(--color-brand-600)]",
    teal: "text-teal-600",
    violet: "text-violet-600",
    slate: "text-[var(--color-muted)]",
  };

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-xs">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
        <Icon className={`size-3.5 ${iconColors[tone]}`} />
        {label}
      </div>
      <div
        className={
          small
            ? "mt-2 text-[13px] font-semibold text-[var(--color-ink)]"
            : `mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)] ${
                mono ? "font-mono" : ""
              }`
        }
      >
        {value}
      </div>
    </div>
  );
}

function RawBlock({ title, data }: { title: string; data: unknown }) {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(data, null, 2);

  function copyToClipboard() {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {title}
        </p>
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy JSON
            </>
          )}
        </button>
      </div>
      <pre className="scrollbar-thin max-h-96 overflow-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-sidebar)] p-5 font-mono text-[12px] leading-relaxed text-slate-200">
        {jsonStr}
      </pre>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-28 rounded-md" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-4 gap-3.5">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
