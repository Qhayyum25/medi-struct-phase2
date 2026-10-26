import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, GitBranch, Play, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { analyticsApi } from "../../api/analytics";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { titleCase } from "../../lib/format";
import { describeError, errorCode } from "../../lib/errors";
import type { AssociationRuleResponse } from "../../types/api";

export default function AssociationRulesPage() {
  const [itemLevel, setItemLevel] = useState<"entity_type" | "entity_text">("entity_type");
  const [minSupport, setMinSupport] = useState(0.1);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [minLift, setMinLift] = useState(1.0);

  const mutation = useMutation<AssociationRuleResponse, unknown>({
    mutationFn: () =>
      analyticsApi.associationRules({
        item_level: itemLevel,
        min_support: minSupport,
        min_confidence: minConfidence,
        min_lift: minLift,
      }),
  });

  const insufficientData = errorCode(mutation.error) === "INSUFFICIENT_DATA";

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
        title="Clinical Association Rule Mining"
        description="Frequent itemset and association rule discovery via the Apriori algorithm to identify co-occurrence dependencies across clinical encounters."
      />

      {/* ─── Parameter Controls ────────────────────────────────────── */}
      <Card>
        <CardBody className="flex flex-wrap items-end gap-4 p-5">
          <Select
            label="Mining Granularity"
            value={itemLevel}
            onChange={(e) => setItemLevel(e.target.value as typeof itemLevel)}
            className="w-56 !h-10 text-[13px]"
          >
            <option value="entity_type">Entity Category (Coarse / Macro)</option>
            <option value="entity_text">Specific Concept Value (Micro)</option>
          </Select>
          <Input
            label="Min Support"
            type="number"
            step={0.05}
            min={0.01}
            max={1}
            value={minSupport}
            onChange={(e) => setMinSupport(Number(e.target.value))}
            className="w-28"
          />
          <Input
            label="Min Confidence"
            type="number"
            step={0.05}
            min={0.01}
            max={1}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-28"
          />
          <Input
            label="Min Lift"
            type="number"
            step={0.1}
            min={0}
            value={minLift}
            onChange={(e) => setMinLift(Number(e.target.value))}
            className="w-28"
          />
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="py-2.5"
          >
            <Play className="size-3.5" /> Run Apriori Mining
          </Button>
        </CardBody>
      </Card>

      {/* ─── Results Output ────────────────────────────────────────── */}
      {mutation.isError ? (
        <Card>
          {insufficientData ? (
            <EmptyState
              icon={GitBranch}
              title="Insufficient transaction volume"
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
        <Card>
          <CardHeader
            title={`${mutation.data.rules.length} Association Rule${
              mutation.data.rules.length === 1 ? "" : "s"
            } Discovered`}
            subtitle={`Computed across ${mutation.data.transactions_considered} completed clinical document${
              mutation.data.transactions_considered === 1 ? "" : "s"
            }`}
          />
          {mutation.data.rules.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No rules satisfied these threshold criteria"
              description="Try lowering the minimum support or confidence values."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    <th className="px-6 py-3">Antecedent (If present)</th>
                    <th className="px-6 py-3"></th>
                    <th className="px-6 py-3">Consequent (Also implies)</th>
                    <th className="px-6 py-3">Support</th>
                    <th className="px-6 py-3">Confidence</th>
                    <th className="px-6 py-3 text-right">Lift Correlation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {mutation.data.rules.map((r, i) => (
                    <tr
                      key={i}
                      className="hover:bg-[var(--color-canvas)]/60 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {r.antecedents.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-brand-700)]"
                            >
                              {titleCase(item)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3.5 text-center text-[var(--color-muted)]">
                        <ArrowRight className="size-4 inline" />
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {r.consequents.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[12px] font-semibold text-teal-800"
                            >
                              {titleCase(item)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[12px] font-semibold tabular text-[var(--color-ink-soft)]">
                        {(r.support * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[12px] font-semibold tabular text-[var(--color-ink-soft)]">
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                            r.lift >= 1.5
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : r.lift >= 1
                              ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]"
                              : "bg-[var(--color-canvas)] text-[var(--color-muted)] border border-[var(--color-line)]"
                          }`}
                        >
                          <TrendingUp className="size-3" />
                          {r.lift.toFixed(2)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={GitBranch}
            title="Execute mining to compute association rules"
            description="Choose support and confidence thresholds above, then click 'Run Apriori Mining'."
          />
        </Card>
      )}
    </div>
  );
}
