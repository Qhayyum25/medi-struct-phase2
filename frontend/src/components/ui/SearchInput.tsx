import { Search, X } from "lucide-react";
import { cn } from "../../lib/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  large?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocus,
  large,
}: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search
        className={cn(
          "absolute left-3 shrink-0 text-[var(--color-muted)] pointer-events-none",
          large ? "size-5 left-4" : "size-3.5",
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)] focus:border-[var(--color-brand-400)]",
          "hover:border-[var(--color-brand-300)]",
          large ? "pl-11 pr-10 py-3 text-[15px]" : "pl-9 pr-8 py-2 text-[13px]",
        )}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className={cn(
            "absolute right-0 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink-soft)] transition-colors",
            large ? "right-3 size-8" : "right-2 size-6",
          )}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
