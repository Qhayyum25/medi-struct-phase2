import { entityStyle } from "../../lib/entityTypes";

export function EntityBadge({ type }: { type: string }) {
  const style = entityStyle(type);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ background: style.dot }}
      />
      {type}
    </span>
  );
}

export function RelationBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-violet-100)] bg-[var(--color-violet-50)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-violet-600)]">
      <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
        <circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="4" cy="4" r="1.5" fill="currentColor" />
      </svg>
      {type.replace(/_/g, " ")}
    </span>
  );
}
