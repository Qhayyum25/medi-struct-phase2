import { useRef, useState, type ReactNode, type WheelEvent, type MouseEvent } from "react";
import { ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react";

interface Props {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
}

/**
 * Interactive SVG canvas for biomedical network views (Relation Explorer and Clinical Knowledge Map)
 * Scroll to zoom, drag to pan, reset controls.
 */
export function GraphCanvas({ width, height, children, className }: Props) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({ ...t, scale: Math.min(3, Math.max(0.4, t.scale * delta)) }));
  }

  function onMouseDown(e: MouseEvent) {
    dragging.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging.current) return;
    setTransform((t) => ({
      ...t,
      x: e.clientX - dragging.current!.x,
      y: e.clientY - dragging.current!.y,
    }));
  }

  function endDrag() {
    dragging.current = null;
  }

  function reset() {
    setTransform({ x: 0, y: 0, scale: 1 });
  }

  return (
    <div
      className={`relative select-none overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-inner ${
        className ?? ""
      }`}
      style={{
        backgroundImage: "radial-gradient(circle, var(--color-line) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className="cursor-grab active:cursor-grabbing"
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          {children}
        </g>
      </svg>

      {/* Canvas Controls */}
      <div className="absolute right-3.5 top-3.5 flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]/90 p-1 backdrop-blur-md shadow-xs">
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))}
          className="flex size-7 items-center justify-center rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-brand-600)] transition-colors"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.4, t.scale * 0.8) }))}
          className="flex size-7 items-center justify-center rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-brand-600)] transition-colors"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          onClick={reset}
          className="flex size-7 items-center justify-center rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-brand-600)] transition-colors"
          aria-label="Reset zoom and position"
          title="Reset view"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {/* Helper hint pill */}
      <div className="absolute bottom-3 left-3.5 flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)]/80 px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)] backdrop-blur-xs">
        <Move className="size-3" />
        <span>Drag to pan · Scroll to zoom</span>
      </div>
    </div>
  );
}
