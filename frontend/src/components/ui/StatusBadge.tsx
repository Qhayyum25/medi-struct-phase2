import type { DocumentStatus } from "../../types/api";

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  uploaded:     { label: "Uploaded",     dot: "#94A3B8", bg: "#F1F5F9", text: "#475569" },
  extracted:    { label: "Extracted",    dot: "#60A5FA", bg: "#EFF6FF", text: "#2563EB" },
  deidentified: { label: "De-identified", dot: "#818CF8", bg: "#EEF2FF", text: "#4F46E5" },
  processing:   { label: "Processing",   dot: "#FBBF24", bg: "#FFFBEB", text: "#B45309" },
  completed:    { label: "Completed",    dot: "#34D399", bg: "#ECFDF5", text: "#065F46" },
  failed:       { label: "Failed",       dot: "#F87171", bg: "#FFF1F2", text: "#BE123C" },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.uploaded;
  const isProcessing = status === "processing";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: cfg.bg,
        color: cfg.text,
        borderColor: cfg.dot + "40",
      }}
    >
      <span className="relative flex size-1.5 shrink-0">
        {isProcessing && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: cfg.dot, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }}
          />
        )}
        <span
          className="relative inline-flex size-1.5 rounded-full"
          style={{ background: cfg.dot }}
        />
      </span>
      {cfg.label}
    </span>
  );
}
