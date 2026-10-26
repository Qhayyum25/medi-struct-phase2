import { cn } from "../../lib/cn";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: "brand" | "teal" | "violet" | "amber" | "rose" | "slate";
  trend?: { value: number; label?: string };
  sub?: string;
  className?: string;
}

const TONES = {
  brand:  { bg: "var(--color-brand-50)",  icon: "var(--color-brand-500)",  val: "var(--color-brand-700)",  ring: "var(--color-brand-100)" },
  teal:   { bg: "var(--color-teal-50)",   icon: "var(--color-teal-500)",   val: "var(--color-teal-700)",   ring: "var(--color-teal-100)" },
  violet: { bg: "var(--color-violet-50)", icon: "var(--color-violet-500)", val: "var(--color-violet-700)", ring: "var(--color-violet-100)" },
  amber:  { bg: "var(--color-amber-50)",  icon: "var(--color-amber-500)",  val: "var(--color-amber-600)",  ring: "var(--color-amber-100)" },
  rose:   { bg: "var(--color-rose-50)",   icon: "var(--color-rose-500)",   val: "var(--color-rose-700)",   ring: "var(--color-rose-100)" },
  slate:  { bg: "var(--color-canvas)",    icon: "var(--color-muted)",      val: "var(--color-ink-soft)",   ring: "var(--color-line)" },
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  trend,
  sub,
  className,
}: MetricCardProps) {
  const c = TONES[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-4 shadow-[var(--shadow-xs)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5",
        className
      )}
    >
      {/* Subtle background accent */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top right, ${c.bg} 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {label}
          </p>
          <p
            className="mt-2 text-2xl font-bold tabular leading-none"
            style={{ color: c.val }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p
              className={`mt-1.5 text-[11px] font-semibold ${
                trend.value >= 0 ? "text-[var(--color-teal-600)]" : "text-[var(--color-rose-600)]"
              }`}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              {trend.label && (
                <span className="font-normal text-[var(--color-muted)] ml-1">
                  {trend.label}
                </span>
              )}
            </p>
          )}
          {sub && !trend && (
            <p className="mt-1.5 text-[11px] font-medium text-[var(--color-muted)]">
              {sub}
            </p>
          )}
        </div>

        {/* Icon */}
        <span
          className="flex size-9 items-center justify-center rounded-lg shrink-0"
          style={{ background: c.ring }}
        >
          <Icon className="size-4.5" style={{ color: c.icon }} />
        </span>
      </div>
    </div>
  );
}
