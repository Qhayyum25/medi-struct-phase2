import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, FileStack, Activity, ArrowRight, ShieldCheck, Search } from "lucide-react";
import { patientsApi } from "../../api/patients";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { formatDate } from "../../lib/format";

const PAGE_SIZE = 12;

export default function PatientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patients", page],
    queryFn: () => patientsApi.list({ page, page_size: PAGE_SIZE }),
  });

  const filteredItems = data?.items.filter((p) =>
    search ? p.anonymized_identifier.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Pseudonymous patient cohorts synthesized from extracted documents. Records are indexed strictly by cryptographic identifier."
      />

      {isError ? (
        <ErrorState
          message="Could not retrieve the patients directory."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <Card>
          <SkeletonRows rows={6} />
        </Card>
      ) : data && data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No patient cohorts created yet"
            description="Process a clinical document that contains patient observations, lab values, or diagnoses to generate a pseudonymous record."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Quick search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder="Search pseudonymous identifier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 text-[13px] text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-brand-500)] focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>HIPAA Safe Harbor Hash Enforced</span>
            </div>
          </div>

          <Card>
            <div className="grid grid-cols-1 divide-y divide-[var(--color-line)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {filteredItems?.map((p) => (
                <Link
                  key={p.id}
                  to={`/patients/${p.id}`}
                  className="group flex flex-col justify-between p-6 transition-all hover:bg-[var(--color-canvas)]/60"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border border-[var(--color-brand-100)] group-hover:scale-105 transition-transform">
                        <Users className="size-5" />
                      </span>
                      <span className="flex size-7 items-center justify-center rounded-lg text-[var(--color-muted)] opacity-0 group-hover:opacity-100 group-hover:text-[var(--color-brand-600)] transition-all">
                        <ArrowRight className="size-4" />
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="font-mono text-[14px] font-bold text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)] transition-colors">
                        {p.anonymized_identifier}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)] font-medium">
                        Enrolled {formatDate(p.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3 pt-3 border-t border-[var(--color-line)] text-[12px] font-medium text-[var(--color-ink-soft)]">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-canvas)] px-2.5 py-1">
                      <FileStack className="size-3.5 text-[var(--color-muted)]" />
                      {p.document_count} doc{p.document_count === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-canvas)] px-2.5 py-1">
                      <Activity className="size-3.5 text-teal-600" />
                      {p.observation_count} obs
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data!.total}
              onPageChange={setPage}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
