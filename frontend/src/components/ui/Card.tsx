import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden",
        "shadow-[var(--shadow-xs)]",
        hover && "card-hover cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--color-line)]",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-[var(--color-ink)] leading-snug">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-[var(--color-muted)] leading-snug">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 py-4", className)}>{children}</div>
  );
}

/** A stat tile used on document / patient detail pages */
export function StatTile({
  icon: Icon,
  label,
  value,
  mono,
  small,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  mono?: boolean;
  small?: boolean;
  accent?: "teal" | "brand" | "violet" | "amber";
}) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    teal:   { bg: "var(--color-teal-50)",   text: "var(--color-teal-600)",   icon: "var(--color-teal-500)" },
    brand:  { bg: "var(--color-brand-50)",  text: "var(--color-brand-600)",  icon: "var(--color-brand-500)" },
    violet: { bg: "var(--color-violet-50)", text: "var(--color-violet-600)", icon: "var(--color-violet-500)" },
    amber:  { bg: "var(--color-amber-50)",  text: "var(--color-amber-600)",  icon: "var(--color-amber-500)" },
  };
  const c = accent ? colors[accent] : colors.brand;

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="flex size-6 items-center justify-center rounded-md"
          style={{ background: c.bg }}
        >
          <Icon className="size-3.5" style={{ color: c.icon }} />
        </span>
        <span className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wide">{label}</span>
      </div>
      <div
        className={cn(
          "font-semibold text-[var(--color-ink)]",
          small ? "text-[14px]" : "text-xl",
          mono ? "font-mono tabular" : "",
        )}
        style={accent ? { color: c.text } : {}}
      >
        {value}
      </div>
    </div>
  );
}
