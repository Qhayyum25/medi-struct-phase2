import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--color-rose-50)] border border-[var(--color-rose-100)]">
        <AlertTriangle className="size-6 text-[var(--color-rose-500)]" />
      </span>
      <div>
        <p className="text-[14px] font-semibold text-[var(--color-ink)]">Something went wrong</p>
        <p className="mt-1 text-[13px] text-[var(--color-muted)] max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
