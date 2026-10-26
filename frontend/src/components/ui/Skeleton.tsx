import { cn } from "../../lib/cn";
import { type CSSProperties } from "react";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="px-5 py-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton
            className="h-3.5 flex-1"
            style={{ opacity: 1 - i * 0.12 }}
          />
          <Skeleton
            className="h-3.5 w-24"
            style={{ opacity: 0.7 - i * 0.08 }}
          />
          <Skeleton
            className="h-3.5 w-16"
            style={{ opacity: 0.5 - i * 0.05 }}
          />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 space-y-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}
