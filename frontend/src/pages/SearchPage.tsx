import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search as SearchIcon,
  FileStack,
  Dna,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { searchApi } from "../api/search";
import { PageHeader } from "../components/ui/PageHeader";
import { SearchInput } from "../components/ui/SearchInput";
import { Select } from "../components/ui/Select";
import { Card } from "../components/ui/Card";
import { Tabs } from "../components/ui/Tabs";
import { EntityBadge } from "../components/ui/EntityBadge";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ConfidenceMeter } from "../components/ui/ConfidenceMeter";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useDebounce } from "../hooks/useDebounce";
import { titleCase, formatDateTime } from "../lib/format";

type Tab = "entities" | "relations" | "documents";

const SUGGESTIONS = [
  "Metformin",
  "Type 2 Diabetes",
  "Hypertension",
  "HbA1c",
  "Chest Pain",
  "Echocardiogram",
  "Lisinopril",
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [tab, setTab] = useState<Tab>("entities");
  const debouncedQ = useDebounce(q, 350);

  const hasFilter = Boolean(debouncedQ || entityType);
  const params = {
    q: debouncedQ || undefined,
    entity_type: entityType || undefined,
    page_size: 20,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["search", params],
    queryFn: () => searchApi.search(params),
    enabled: hasFilter,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search Clinical Intelligence"
        description="Search across biomedical entities, relation graphs, and ingested documents with full-text and semantic indexing."
      />

      {/* ─── Search Controls ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search clinical terms, diagnoses, medications, or filenames..."
            className="flex-1 max-w-xl"
            large
            autoFocus
          />
          <Select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="!h-12 w-52 text-[13px]"
          >
            <option value="">All entity categories</option>
            {[
              "Disease",
              "Symptom",
              "Medication",
              "Procedure",
              "Test",
              "LabValue",
              "Anatomy",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        {/* Quick query chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] text-[var(--color-muted)]">
          <span className="font-semibold text-[var(--color-ink-soft)]">Suggested terms:</span>
          {SUGGESTIONS.map((term) => (
            <button
              key={term}
              onClick={() => setQ(term)}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)] transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Results Container ─────────────────────────────────────── */}
      {!hasFilter ? (
        <Card>
          <EmptyState
            icon={SearchIcon}
            title="Enter a query to search knowledge"
            description="Type a clinical concept, medication brand, condition, or document filename above to search."
          />
        </Card>
      ) : isError ? (
        <Card>
          <ErrorState
            message="Search index query failed. Please verify backend connection."
            onRetry={() => refetch()}
          />
        </Card>
      ) : (
        <Card>
          <Tabs
            active={tab}
            onChange={(k) => setTab(k as Tab)}
            tabs={[
              {
                key: "entities",
                label: "Matched Entities",
                count: data?.entities.total ?? 0,
              },
              {
                key: "relations",
                label: "Matched Relations",
                count: data?.relations.total ?? 0,
              },
              {
                key: "documents",
                label: "Matched Documents",
                count: data?.documents.total ?? 0,
              },
            ]}
          />

          {isLoading ? (
            <SkeletonRows rows={6} />
          ) : tab === "entities" ? (
            data!.entities.items.length === 0 ? (
              <EmptyState
                icon={Dna}
                title="No matching clinical entities found"
                description="Try broadening your query or selecting 'All entity categories'."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {data!.entities.items.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--color-canvas)]/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <EntityBadge type={e.entity_type} />
                      <span className="font-semibold text-[13px] text-[var(--color-ink)] truncate">
                        {e.entity_text}
                      </span>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      <ConfidenceMeter value={e.confidence} />
                      <Link
                        to={`/documents/${e.document_id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-600)] hover:underline"
                      >
                        Inspect note <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : tab === "relations" ? (
            data!.relations.items.length === 0 ? (
              <EmptyState
                icon={GitBranch}
                title="No matching clinical relations found"
                description="Try searching for a specific subject entity, medication, or condition."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {data!.relations.items.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-[var(--color-canvas)]/60 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <EntityBadge type={r.subject_entity.entity_type} />
                      <span className="font-semibold text-[var(--color-ink)]">
                        {r.subject_entity.entity_text}
                      </span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                        {titleCase(r.relation_type)}
                      </span>
                      <EntityBadge type={r.object_entity.entity_type} />
                      <span className="font-semibold text-[var(--color-ink)]">
                        {r.object_entity.entity_text}
                      </span>
                    </div>
                    <Link
                      to={`/documents/${r.document_id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-600)] hover:underline"
                    >
                      Source note <ArrowRight className="size-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : data!.documents.items.length === 0 ? (
            <EmptyState
              icon={FileStack}
              title="No matching documents found"
              description="Verify your spelling or try searching for another filename."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {data!.documents.items.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/documents/${d.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-[var(--color-canvas)]/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="truncate text-[13px] font-semibold text-[var(--color-ink)]">
                        {d.filename}
                      </span>
                      <span className="rounded bg-[var(--color-canvas)] border border-[var(--color-line)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--color-muted)]">
                        {d.file_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <StatusBadge status={d.status} />
                      <span className="text-[12px] text-[var(--color-muted)]">
                        {formatDateTime(d.created_at)}
                      </span>
                      <ArrowRight className="size-3.5 text-[var(--color-muted)]" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
