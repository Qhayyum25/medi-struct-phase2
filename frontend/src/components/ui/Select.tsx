import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, id, children, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[12px] font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide"
          >
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
