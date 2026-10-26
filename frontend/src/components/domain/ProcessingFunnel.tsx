interface Stage {
  label: string;
  value: number;
  tone: string;
}

/**
 * A horizontal clinical pipeline funnel:
 * (documents uploaded → processed → entities extracted → relations discovered)
 */
export function ProcessingFunnel({ stages }: { stages: Stage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <div className="space-y-4">
      {stages.map((s, idx) => {
        const pct = Math.max(4, Math.round((s.value / max) * 100));
        return (
          <div key={s.label} className="group">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 font-medium text-[var(--color-ink-soft)] group-hover:text-[var(--color-ink)] transition-colors">
                <span className="flex size-4 items-center justify-center rounded-full bg-[var(--color-canvas)] text-[10px] font-bold text-[var(--color-muted)]">
                  {idx + 1}
                </span>
                {s.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[var(--color-muted)]">
                  {pct}%
                </span>
                <span className="font-mono font-semibold tabular text-[var(--color-ink)] text-[13px]">
                  {s.value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-canvas)] border border-[var(--color-line)] p-[1px]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out shadow-xs"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${s.tone}CC, ${s.tone})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
