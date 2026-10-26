import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "teal";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium select-none rounded-lg transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-600)] active:scale-[0.98] shadow-[0_1px_3px_rgba(46,80,180,0.3)] hover:shadow-[0_4px_12px_rgba(46,80,180,0.35)] focus-visible:ring-[var(--color-brand-400)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink-soft)] border border-[var(--color-line-strong)] hover:bg-[var(--color-canvas)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-ink)] active:scale-[0.98] focus-visible:ring-[var(--color-brand-400)]",
  ghost:
    "bg-transparent text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] active:scale-[0.98] focus-visible:ring-[var(--color-brand-400)]",
  danger:
    "bg-[var(--color-rose-50)] text-[var(--color-rose-600)] border border-[var(--color-rose-100)] hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)] active:scale-[0.98] focus-visible:ring-[var(--color-rose-400)]",
  teal:
    "bg-[var(--color-teal-500)] text-white hover:bg-[var(--color-teal-600)] active:scale-[0.98] shadow-[0_1px_3px_rgba(15,158,136,0.3)] hover:shadow-[0_4px_12px_rgba(15,158,136,0.35)] focus-visible:ring-[var(--color-teal-400)]",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-2.5 py-1.5 text-[12px] gap-1.5",
  md: "px-3.5 py-2 text-[13px]",
  lg: "px-5 py-2.5 text-[14px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled ?? loading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
    >
      {loading && <Loader2 className="size-3.5 animate-spin shrink-0" />}
      {children}
    </button>
  );
}
