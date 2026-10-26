import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-[var(--color-line)] px-5 py-3">
      <p className="text-[12px] text-[var(--color-muted)]">
        Showing{" "}
        <span className="font-semibold text-[var(--color-ink-soft)]">{from}–{to}</span>
        {" "}of{" "}
        <span className="font-semibold text-[var(--color-ink-soft)]">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex size-7 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="px-2 text-[12px] font-semibold text-[var(--color-ink-soft)] tabular">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex size-7 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
