import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Layers, Play } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { analyticsApi } from "../../api/analytics";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { describeError, errorCode } from "../../lib/errors";
import { cn } from "../../lib/cn";
import type { ClusterResponse } from "../../types/api";

const COLORS = ["#0284C7", "#0D9488", "#7C3AED", "#D97706", "#E11D48", "#2563EB"];

export default function ClusteringPage() {
  const [k, setK] = useState(3);
  const [obsTypes, setObsTypes] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const mutation = useMutation<ClusterResponse, unknown>({
    mutationFn: () =>
      analyticsApi.clusters({
        k,
        observation_types: obsTypes.trim()
          ? obsTypes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
      }),
    onSuccess: () => setSelected(null),
  });

  const insufficientData = errorCode(mutation.error) === "INSUFFICIENT_DATA";
  const chartData = useMemo(() => {
    if (!mutation.data) return [];
    return mutation.data.observation_types.map((type) => {
      const row: Record<string, string | number> = { type };
      mutation.data!.clusters.forEach((c) => {
        row[`Cluster ${c.cluster}`] = c.mean_values[type] ?? 0;
      });
      return row;
    });
  }, [mutation.data]);

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
        title="Unsupervised Patient Clustering"
        description="Standardized multi-variate K-Means clustering across patients' continuous lab observations to detect phenotypic subgroups."
      />

      {/* ─── Parameter Controls ────────────────────────────────────── */}
      <Card>
        <CardBody className="flex flex-wrap items-end gap-4 p-5">
          <Input
            label="Target Clusters (k)"
            type="number"
            min={2}
            max={20}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="w-40"
          />
          <Input
            label="Observation Types (optional)"
            placeholder="e.g. HbA1c, Systolic, Glucose"
            value={obsTypes}
            onChange={(e) => setObsTypes(e.target.value)}
            hint="Comma-separated. Leave blank to automatically select all numeric features."
            className="w-80"
          />
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="py-2.5"
          >
            <Play className="size-3.5" /> Execute K-Means
          </Button>
        </CardBody>
      </Card>

      {/* ─── Output Container ──────────────────────────────────────── */}
      {mutation.isError ? (
        <Card>
          {insufficientData ? (
            <EmptyState
              icon={Layers}
              title="Insufficient observation data to form clusters"
              description={describeError(mutation.error)}
            />
          ) : (
            <ErrorState
              message={describeError(mutation.error)}
              onRetry={() => mutation.mutate()}
            />
          )}
        </Card>
      ) : mutation.data ? (
        <div className="space-y-6">
          {/* Cluster Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-[var(--color-ink)]">
                Identified Phenotypes ({mutation.data.clusters.length})
              </span>
              <span className="text-[12px] text-[var(--color-muted)] font-mono">
                Model Inertia: {mutation.data.inertia.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mutation.data.clusters.map((c) => {
                const color = COLORS[c.cluster % COLORS.length];
                const isSelected = selected === c.cluster;
                return (
                  <button
                    key={c.cluster}
                    onClick={() => setSelected(isSelected ? null : c.cluster)}
                    className="text-left w-full"
                  >
                    <Card
                      className={cn(
                        "h-full transition-all duration-150 hover:shadow-xs",
                        isSelected
                          ? "ring-2 ring-[var(--color-brand-500)] border-transparent"
                          : "hover:border-[var(--color-brand-300)]"
                      )}
                    >
                      <CardBody className="p-5">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line)]">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[14px] font-bold text-[var(--color-ink)]">
                              Cluster {c.cluster}
                            </span>
                          </div>
                          <span className="rounded-full bg-[var(--color-canvas)] border border-[var(--color-line)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-ink-soft)]">
                            {c.size} patient{c.size === 1 ? "" : "s"}
                          </span>
                        </div>

                        <dl className="mt-3.5 space-y-2">
                          {Object.entries(c.mean_values).map(([type, value]) => (
                            <div
                              key={type}
                              className="flex items-center justify-between text-[12px]"
                            >
                              <dt className="text-[var(--color-muted)] font-medium truncate max-w-[140px]">
                                {type}
                              </dt>
                              <dd className="font-mono font-semibold tabular text-[var(--color-ink)]">
                                {value.toFixed(2)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </CardBody>
                    </Card>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Composition Map */}
          <Card>
            <CardHeader
              title="Cluster Cohort Density"
              subtitle="Pseudonymous patients mapped to assigned clusters. Click any dot to inspect patient record."
            />
            <CardBody className="p-6">
              <div className="flex flex-wrap gap-8">
                {mutation.data.clusters.map((c) => {
                  const color = COLORS[c.cluster % COLORS.length];
                  const assignments = mutation.data!.assignments.filter(
                    (a) => a.cluster === c.cluster
                  );
                  return (
                    <div
                      key={c.cluster}
                      className={cn(
                        "transition-opacity duration-200",
                        selected !== null && selected !== c.cluster && "opacity-25"
                      )}
                    >
                      <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-ink)]">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        Cluster {c.cluster} ({assignments.length})
                      </p>
                      <div className="flex max-w-[240px] flex-wrap gap-2">
                        {assignments.map((a) => (
                          <Link
                            key={a.patient_id}
                            to={`/patients/${a.patient_id}`}
                            title={`${a.anonymized_identifier} (Click to open)`}
                            className="size-4 rounded-full transition-transform hover:scale-150 shadow-2xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Recharts Bar Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader
                title="Phenotypic Profiles Comparison"
                subtitle="Mean standardized value per quantitative observation across all discovered clusters"
              />
              <CardBody className="p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                    <XAxis
                      dataKey="type"
                      tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RTooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 10,
                        border: "1px solid var(--color-line)",
                        backgroundColor: "var(--color-surface)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    {mutation.data.clusters.map((c) => (
                      <Bar
                        key={c.cluster}
                        dataKey={`Cluster ${c.cluster}`}
                        fill={COLORS[c.cluster % COLORS.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* Patients Assignment Table */}
          <Card>
            <CardHeader
              title="Assigned Patients"
              subtitle={
                selected !== null
                  ? `Showing patients assigned strictly to Cluster ${selected}`
                  : "Showing all patients across all clusters"
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    <th className="px-6 py-3">Patient Identifier</th>
                    <th className="px-6 py-3">Assigned Phenotype</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {mutation.data.assignments
                    .filter((a) => selected === null || a.cluster === selected)
                    .map((a) => {
                      const color = COLORS[a.cluster % COLORS.length];
                      return (
                        <tr
                          key={a.patient_id}
                          className="hover:bg-[var(--color-canvas)]/60 transition-colors"
                        >
                          <td className="px-6 py-3.5">
                            <Link
                              to={`/patients/${a.patient_id}`}
                              className="font-mono font-bold text-[var(--color-ink)] hover:text-[var(--color-brand-600)]"
                            >
                              {a.anonymized_identifier}
                            </Link>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold bg-[var(--color-canvas)] border border-[var(--color-line)] text-[var(--color-ink)]">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              Cluster {a.cluster}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <Link
                              to={`/patients/${a.patient_id}`}
                              className="text-[12px] font-semibold text-[var(--color-brand-600)] hover:underline"
                            >
                              View profile →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Layers}
            title="Execute clustering to discover patient phenotypes"
            description="Adjust the number of clusters (k) and features above, then click 'Execute K-Means'."
          />
        </Card>
      )}
    </div>
  );
}
