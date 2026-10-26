import { cn } from "../../lib/cn";

export function ConfidenceMeter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.round(value * 100);

  const barBg =
    value >= 0.85
      ? "bg-teal-500"
      : value >= 0.6
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--color-line)] p-[0.5px]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barBg)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] font-semibold tabular text-[var(--color-ink-soft)]">
        {pct}%
      </span>
    </div>
  );
}
