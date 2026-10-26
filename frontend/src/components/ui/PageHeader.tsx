import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[13px] text-[var(--color-muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  );
}
