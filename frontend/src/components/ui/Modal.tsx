import { type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
  footer,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "fade-in 150ms ease both" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative w-full rounded-2xl bg-[var(--color-surface)] shadow-[var(--shadow-xl)] flex flex-col max-h-[90vh] border border-[var(--color-line)]",
          width
        )}
        style={{ animation: "scale-in 180ms cubic-bezier(0.34,1.56,0.64,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4 shrink-0">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h2>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink-soft)] transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-line)] bg-[var(--color-canvas)]/40 px-6 py-3.5 rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
