import { useEffect, useRef, useState, type ReactNode } from "react";

export function Popover({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <span className="relative inline" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <span
          className="absolute left-1/2 top-full z-30 mt-2 block w-72 -translate-x-1/2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 text-left shadow-[var(--shadow-lg)]"
          style={{ animation: "scale-in 150ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
