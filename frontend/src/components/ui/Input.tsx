import { type InputHTMLAttributes, type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

/* ─── Input ──────────────────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[12px] font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "block w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)] focus:ring-offset-0 focus:border-[var(--color-brand-400)]",
            error
              ? "border-[var(--color-rose-400)] bg-[var(--color-rose-50)]"
              : "border-[var(--color-line-strong)] hover:border-[var(--color-brand-300)]",
            className,
          )}
          {...rest}
        />
        {hint && !error && (
          <p className="text-[11px] text-[var(--color-muted)]">{hint}</p>
        )}
        {error && (
          <p className="text-[11px] text-[var(--color-rose-600)]">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

/* ─── Select ─────────────────────────────────────────────────────── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, id, children, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-[12px] font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "block w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-ink)] transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)] focus:border-[var(--color-brand-400)]",
            "hover:border-[var(--color-brand-300)]",
            "appearance-none cursor-pointer",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
      </div>
    );
  },
);
Select.displayName = "Select";
