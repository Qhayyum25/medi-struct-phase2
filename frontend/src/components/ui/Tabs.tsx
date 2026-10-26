import { cn } from "../../lib/cn";

interface Tab { key: string; label: string; count?: number }

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 border-b border-[var(--color-line)] px-4",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors",
              isActive
                ? "text-[var(--color-brand-600)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink-soft)]"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular",
                  isActive
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]"
                    : "bg-[var(--color-canvas)] text-[var(--color-muted)]"
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--color-brand-500)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
