import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface BadgeProps {
  children: ReactNode;
  tone?: "brand" | "teal" | "violet" | "amber" | "rose" | "slate" | "sky";
  size?: "xs" | "sm";
  dot?: boolean;
  className?: string;
}

const TONES = {
  brand:  "bg-[var(--color-brand-50)]  text-[var(--color-brand-600)]  border-[var(--color-brand-100)]",
  teal:   "bg-[var(--color-teal-50)]   text-[var(--color-teal-700)]   border-[var(--color-teal-100)]",
  violet: "bg-[var(--color-violet-50)] text-[var(--color-violet-600)] border-[var(--color-violet-100)]",
  amber:  "bg-[var(--color-amber-50)]  text-[var(--color-amber-600)]  border-[var(--color-amber-100)]",
  rose:   "bg-[var(--color-rose-50)]   text-[var(--color-rose-600)]   border-[var(--color-rose-100)]",
  slate:  "bg-[var(--color-canvas)]    text-[var(--color-ink-faint)]  border-[var(--color-line-strong)]",
  sky:    "bg-[var(--color-sky-50)]    text-[var(--color-electric-500)] border-[var(--color-sky-50)]",
};

const DOT_COLORS: Record<string, string> = {
  brand:  "bg-[var(--color-brand-400)]",
  teal:   "bg-[var(--color-teal-400)]",
  violet: "bg-[var(--color-violet-400)]",
  amber:  "bg-[var(--color-amber-400)]",
  rose:   "bg-[var(--color-rose-400)]",
  slate:  "bg-[var(--color-muted)]",
  sky:    "bg-[var(--color-electric-400)]",
};

export function Badge({ children, tone = "brand", size = "sm", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        TONES[tone],
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        className,
      )}
    >
      {dot && (
        <span className={cn("size-1.5 rounded-full shrink-0", DOT_COLORS[tone])} />
      )}
      {children}
    </span>
  );
}
