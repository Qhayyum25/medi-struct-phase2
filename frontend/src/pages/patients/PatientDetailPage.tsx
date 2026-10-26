import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileStack,
  Activity,
  Calendar,
  Shield,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { patientsApi } from "../../api/patients";
import { documentsApi } from "../../api/documents";
import { entitiesApi } from "../../api/entities";
import { relationsApi } from "../../api/relations";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { EntityBadge } from "../../components/ui/EntityBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { KnowledgeMap } from "../../components/domain/KnowledgeMap";
import { formatDate } from "../../lib/format";
import type { DocumentDetail, EntityRead, RelationRead } from "../../types/api";

const GROUP_ORDER = [
  "Disease",
  "Symptom",
  "Medication",
  "Test",
  "LabValue",
  "Procedure",
  "Anatomy",
];

async function loadPatient(id: string) {
  const patient = await patientsApi.get(id);
  const documents: DocumentDetail[] = await Promise.all(
    patient.document_ids.map((d) => documentsApi.get(d, false))
  );

  const entityLists = await Promise.all(
    patient.document_ids.map((d) => entitiesApi.forDocument(d, { page_size: 100 }))
  );
  const relationLists = await Promise.all(
    patient.document_ids.map((d) => relationsApi.forDocument(d, { page_size: 100 }))
  );

  const entitiesByDoc: Record<string, EntityRead[]> = {};
  patient.document_ids.forEach((d, i) => {
    entitiesByDoc[d] = entityLists[i].items;
  });
  const relations: RelationRead[] = relationLists.flatMap((r) => r.items);

  const grouped = new Map<string, EntityRead[]>();
  Object.values(entitiesByDoc)
    .flat()
    .forEach((e) => {
      if (!grouped.has(e.entity_type)) grouped.set(e.entity_type, []);
      grouped.get(e.entity_type)!.push(e);
    });

  return { patient, documents, entitiesByDoc, relations, grouped };
}

export default function PatientDetailPage() {
  const { id = "" } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patient-detail", id],
    queryFn: () => loadPatient(id),
  });

  if (isLoading) return <PatientSkeleton />;
  if (isError || !data) {
    return (
      <ErrorState
        message="Unable to load this pseudonymous patient record."
        onRetry={() => refetch()}
      />
    );
  }

  const { patient, documents, entitiesByDoc, relations, grouped } = data;
  const orderedTypes = [
    ...GROUP_ORDER.filter((t) => grouped.has(t)),
    ...Array.from(grouped.keys()).filter((t) => !GROUP_ORDER.includes(t)),
  ];

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb ───────────────────────────────────────────── */}
      <div>
        <Link
          to="/patients"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to patients
        </Link>
      </div>

      {/* ─── Patient Header ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-100)]">
              <Shield className="size-5" />
            </span>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              {patient.anonymized_identifier}
            </h1>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--color-muted)]">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5" /> Enrolled {formatDate(patient.created_at)}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <FileStack className="size-3.5" /> {patient.document_count} Linked Document
              {patient.document_count === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="size-3.5 text-teal-600" /> {patient.observation_count}{" "}
              Clinical Observations
            </span>
          </div>
        </div>
      </div>

      {/* ─── Signature Visualization: Clinical Knowledge Map ───────── */}
      {relations.length > 0 && (
        <Card>
          <CardHeader
            title="Concentric Clinical Knowledge Map"
            subtitle="Architectural synthesis showing Patient Hub → Ingested Documents → Extracted Concepts → Semantic Arcs"
            action={
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-600)]">
                <Sparkles className="size-3.5" /> Live Knowledge Graph
              </span>
            }
          />
          <CardBody className="p-6">
            <KnowledgeMap
              patientLabel={patient.anonymized_identifier}
              documents={documents}
              entitiesByDoc={entitiesByDoc}
              relations={relations}
            />
          </CardBody>
        </Card>
      )}

      {/* ─── Details Grid (Documents & Findings) ───────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Linked Documents */}
        <div className="lg:col-span-5">
          <Card className="h-full">
            <CardHeader
              title="Clinical Documents"
              subtitle={`${documents.length} document${documents.length === 1 ? "" : "s"} associated with this patient`}
            />
            {documents.length === 0 ? (
              <CardBody>
                <EmptyState icon={FileStack} title="No linked documents" />
              </CardBody>
            ) : (
              <div className="divide-y divide-[var(--color-line)]">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}`}
                    className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[var(--color-canvas)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] group-hover:border-[var(--color-brand-200)] group-hover:text-[var(--color-brand-600)] transition-colors">
                        <FileText className="size-4" />
                      </span>
                      <span className="truncate text-[13px] font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)]">
                        {doc.filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={doc.status} />
                      <ArrowRight className="size-3.5 text-[var(--color-muted)] group-hover:text-[var(--color-brand-600)] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Clinical Findings Aggregator */}
        <div className="lg:col-span-7">
          <Card className="h-full">
            <CardHeader
              title="Clinical Findings Aggregator"
              subtitle="Unique biomedical entities extracted across all encounters for this patient, categorized by ontology"
            />
            {orderedTypes.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon={Activity}
                  title="No findings synthesized yet"
                  description="Run the clinical NLP pipeline on this patient's documents to extract findings."
                />
              </CardBody>
            ) : (
              <CardBody className="space-y-6 p-6">
                {orderedTypes.map((type) => {
                  const uniqueEntities = Array.from(
                    new Set(grouped.get(type)!.map((e) => e.entity_text))
                  );
                  return (
                    <div key={type} className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-1.5">
                        <div className="flex items-center gap-2">
                          <EntityBadge type={type} />
                        </div>
                        <span className="font-mono text-[11px] font-medium text-[var(--color-muted)]">
                          {uniqueEntities.length} unique concept{uniqueEntities.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uniqueEntities.map((text) => (
                          <span
                            key={text}
                            className="inline-flex items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-ink)] shadow-2xs hover:border-[var(--color-brand-300)] transition-colors"
                          >
                            {text}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PatientSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-28 rounded-md" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="lg:col-span-7">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
