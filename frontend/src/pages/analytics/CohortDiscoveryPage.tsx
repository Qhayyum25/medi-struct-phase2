import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Users,
  FileText,
  Filter,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
import { analyticsApi } from "../../api/analytics";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { describeError } from "../../lib/errors";
import type { CohortResponse, EntityFilter, ObservationFilter } from "../../types/api";

const ENTITY_TYPES = [
  "Disease",
  "Symptom",
  "Medication",
  "Procedure",
  "Test",
  "LabValue",
  "Anatomy",
];
const PAGE_SIZE = 10;

export default function CohortDiscoveryPage() {
  const [entityFilters, setEntityFilters] = useState<EntityFilter[]>([
    { entity_type: "Disease", entity_text: "" },
  ]);
  const [obsFilters, setObsFilters] = useState<ObservationFilter[]>([]);
  const [page, setPage] = useState(1);

  const mutation = useMutation<CohortResponse, unknown, number>({
    mutationFn: (targetPage) =>
      analyticsApi.cohorts({
        entity_filters: entityFilters
          .filter((f) => f.entity_type)
          .map((f) => ({ entity_type: f.entity_type, entity_text: f.entity_text || null })),
        observation_filters: obsFilters
          .filter((f) => f.observation_type)
          .map((f) => ({
            observation_type: f.observation_type,
            min_value:
              f.min_value != null && !Number.isNaN(f.min_value) ? f.min_value : null,
            max_value:
              f.max_value != null && !Number.isNaN(f.max_value) ? f.max_value : null,
          })),
        page: targetPage,
        page_size: PAGE_SIZE,
      }),
  });

  function runSearch(targetPage = 1) {
    setPage(targetPage);
    mutation.mutate(targetPage);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to analytics
        </Link>
      </div>

      <PageHeader
        title="Cohort Discovery Builder"
        description="Filter and identify pseudonymous patient cohorts matching multi-dimensional Boolean criteria across clinical entities and quantitative lab observations."
      />

      {/* ─── Filter Builder Card ───────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Clinical Inclusion Criteria"
          subtitle="Add diagnosis, medication, and numerical observation rules (AND logic applied across criteria)"
        />
        <CardBody className="space-y-6 p-6">
          {/* Entity criteria block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2">
              <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--color-ink)]">
                <Filter className="size-4 text-[var(--color-brand-600)]" />
                Clinical Entity Mentions
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setEntityFilters((f) => [...f, { entity_type: "Disease", entity_text: "" }])
                }
              >
                <Plus className="size-3.5" /> Add entity criterion
              </Button>
            </div>

            <div className="space-y-2.5">
              {entityFilters.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Select
                    value={f.entity_type}
                    onChange={(e) =>
                      setEntityFilters((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, entity_type: e.target.value } : x
                        )
                      )
                    }
                    className="w-48 !h-10 text-[13px]"
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder="Must contain term (e.g. 'Diabetes', 'Metformin') — leave empty for any"
                    value={f.entity_text ?? ""}
                    onChange={(e) =>
                      setEntityFilters((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, entity_text: e.target.value } : x
                        )
                      )
                    }
                    className="flex-1"
                  />
                  <button
                    onClick={() => setEntityFilters((arr) => arr.filter((_, j) => j !== i))}
                    className="flex size-9 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                    title="Remove criterion"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {entityFilters.length === 0 && (
                <p className="text-[12px] text-[var(--color-muted)] italic">
                  No entity filters configured.
                </p>
              )}
            </div>
          </div>

          {/* Quantitative Lab observations block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2">
              <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--color-ink)]">
                <FlaskConical className="size-4 text-teal-600" />
                Laboratory Observation Ranges
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setObsFilters((f) => [
                    ...f,
                    { observation_type: "HbA1c", min_value: undefined, max_value: undefined },
                  ])
                }
              >
                <Plus className="size-3.5" /> Add lab criterion
              </Button>
            </div>

            <div className="space-y-2.5">
              {obsFilters.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Input
                    placeholder="Observation code e.g. HbA1c, Glucose"
                    value={f.observation_type}
                    onChange={(e) =>
                      setObsFilters((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, observation_type: e.target.value } : x
                        )
                      )
                    }
                    className="w-56"
                  />
                  <Input
                    type="number"
                    placeholder="Min value"
                    value={f.min_value ?? ""}
                    onChange={(e) =>
                      setObsFilters((arr) =>
                        arr.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                min_value:
                                  e.target.value === "" ? undefined : Number(e.target.value),
                              }
                            : x
                        )
                      )
                    }
                    className="w-28"
                  />
                  <span className="text-[12px] font-semibold text-[var(--color-muted)]">to</span>
                  <Input
                    type="number"
                    placeholder="Max value"
                    value={f.max_value ?? ""}
                    onChange={(e) =>
                      setObsFilters((arr) =>
                        arr.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                max_value:
                                  e.target.value === "" ? undefined : Number(e.target.value),
                              }
                            : x
                        )
                      )
                    }
                    className="w-28"
                  />
                  <button
                    onClick={() => setObsFilters((arr) => arr.filter((_, j) => j !== i))}
                    className="flex size-9 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                    title="Remove criterion"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {obsFilters.length === 0 && (
                <p className="text-[12px] text-[var(--color-muted)] italic">
                  No quantitative lab criteria configured.
                </p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              loading={mutation.isPending}
              disabled={entityFilters.length === 0 && obsFilters.length === 0}
              onClick={() => runSearch(1)}
              className="px-5 py-2.5"
            >
              <Search className="size-4" /> Query matching patient cohort
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ─── Results View ──────────────────────────────────────────── */}
      {mutation.isError ? (
        <Card>
          <ErrorState
            message={describeError(mutation.error)}
            onRetry={() => runSearch(page)}
          />
        </Card>
      ) : mutation.data ? (
        <Card>
          <CardHeader
            title={`${mutation.data.total} Matching Pseudonymous Patient${
              mutation.data.total === 1 ? "" : "s"
            }`}
            subtitle="Patients meeting 100% of the active Boolean criteria"
          />
          {mutation.data.items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No patients match the defined criteria"
              description="Try loosening your filters or removing one of the constraints."
            />
          ) : (
            <>
              <div className="divide-y divide-[var(--color-line)]">
                {mutation.data.items.map((p) => (
                  <div
                    key={p.patient_id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-[var(--color-canvas)]/60 transition-colors"
                  >
                    <div>
                      <Link
                        to={`/patients/${p.patient_id}`}
                        className="font-mono text-[14px] font-bold text-[var(--color-ink)] hover:text-[var(--color-brand-600)] transition-colors"
                      >
                        {p.anonymized_identifier}
                      </Link>
                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                        Matched across {p.documents.length} linked record
                        {p.documents.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {p.documents.map((d) => (
                        <Link
                          key={d.document_id}
                          to={`/documents/${d.document_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)] transition-colors"
                        >
                          <FileText className="size-3.5 text-[var(--color-muted)]" />
                          <span className="truncate max-w-[180px]">{d.filename}</span>
                        </Link>
                      ))}
                      <Link
                        to={`/patients/${p.patient_id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-600)] hover:underline ml-2"
                      >
                        Inspect record <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={mutation.data.total}
                onPageChange={runSearch}
              />
            </>
          )}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={Users}
            title="Configure criteria to explore patient cohorts"
            description="Add entity mentions or laboratory range criteria above, then click 'Query matching patient cohort'."
          />
        </Card>
      )}
    </div>
  );
}
