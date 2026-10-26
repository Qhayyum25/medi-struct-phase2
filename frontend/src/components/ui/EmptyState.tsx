import { type ReactNode, type ElementType } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      {Icon && (
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--color-canvas)] border border-[var(--color-line)]">
          <Icon className="size-6 text-[var(--color-muted)]" />
        </span>
      )}
      <div>
        <p className="text-[14px] font-semibold text-[var(--color-ink-soft)]">{title}</p>
        {description && (
          <p className="mt-1 text-[13px] text-[var(--color-muted)] max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
