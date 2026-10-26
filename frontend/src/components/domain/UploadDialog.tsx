import { useCallback, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { documentsApi } from "../../api/documents";
import { describeError } from "../../lib/errors";
import { cn } from "../../lib/cn";

const ACCEPTED_MIME = ".pdf,.docx,.txt";

type Step = "idle" | "uploaded" | "deidentifying" | "nlp" | "relations" | "completed" | "failed";

const STEP_ORDER: { key: Step; label: string; sub: string }[] = [
  { key: "uploaded", label: "Uploaded & Validated", sub: "Document structure verified" },
  { key: "deidentifying", label: "De-identifying PHI", sub: "Anonymizing patient identifiers" },
  { key: "nlp", label: "Biomedical NER Extraction", sub: "Classifying clinical entities" },
  { key: "relations", label: "Relation Synthesis", sub: "Extracting semantic assertions" },
  { key: "completed", label: "Ready for Analysis", sub: "Knowledge graph generated" },
];

export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setStep("idle");
    setError(null);
    setDocumentId(null);
  }

  function close() {
    reset();
    onClose();
  }

  const runPipeline = useCallback(async (chosen: File) => {
    setError(null);
    try {
      const uploadRes = await documentsApi.upload(chosen);
      setDocumentId(uploadRes.document_id);
      setStep("uploaded");

      const cycle: Step[] = ["deidentifying", "nlp", "relations"];
      let i = 0;
      const timer = setInterval(() => {
        setStep(cycle[i % cycle.length]);
        i += 1;
      }, 1200);

      try {
        await documentsApi.process(uploadRes.document_id);
        clearInterval(timer);
        setStep("completed");
      } catch (err) {
        clearInterval(timer);
        setStep("failed");
        setError(describeError(err));
      }
    } catch (err) {
      setStep("failed");
      setError(describeError(err));
    }
  }, []);

  function handleFiles(files: FileList | null) {
    const chosen = files?.[0];
    if (!chosen) return;
    setFile(chosen);
    runPipeline(chosen);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  const inProgress = step !== "idle" && step !== "completed" && step !== "failed";
  const currentIndex = STEP_ORDER.findIndex((s) => s.key === step);

  return (
    <Modal
      open={open}
      onClose={inProgress ? () => {} : close}
      title="Upload Clinical Document"
      width="max-w-xl"
    >
      {step === "idle" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer",
              dragOver
                ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]/50 scale-[0.99]"
                : "border-[var(--color-line)] bg-[var(--color-canvas)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-surface)]"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-brand-600)] shadow-xs">
              <UploadCloud className="size-7" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-ink)]">
                Drag and drop your clinical document
              </p>
              <p className="mt-1 text-[13px] text-[var(--color-muted)]">
                or click to browse from local workstation
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] px-3 py-1 font-mono text-[11px] font-medium text-[var(--color-ink-soft)]">
                PDF
              </span>
              <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] px-3 py-1 font-mono text-[11px] font-medium text-[var(--color-ink-soft)]">
                DOCX
              </span>
              <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] px-3 py-1 font-mono text-[11px] font-medium text-[var(--color-ink-soft)]">
                TXT
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_MIME}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3 text-[12px] text-[var(--color-muted)]">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              Automated HIPAA de-identification pipeline executed on ingestion
            </span>
            <span className="font-mono text-[11px]">Max 25MB</span>
          </div>
        </div>
      )}

      {step !== "idle" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">
                {file?.name}
              </p>
              <p className="text-[11px] font-mono text-[var(--color-muted)]">
                {file ? (file.size / 1024).toFixed(1) + " KB" : ""}
              </p>
            </div>
            {step === "completed" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="size-3" /> Complete
              </span>
            )}
          </div>

          {/* Stepper */}
          <div className="space-y-0 px-2">
            {STEP_ORDER.map((s, i) => {
              const done =
                step === "completed" ||
                i < currentIndex ||
                (step === "failed" && i < Math.max(currentIndex, 1));
              const active = s.key === step;
              const isFailedHere = step === "failed" && i === Math.max(currentIndex, 0);

              return (
                <div key={s.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  {i < STEP_ORDER.length - 1 && (
                    <span
                      className={cn(
                        "absolute left-[13px] top-6 h-full w-[2px] -translate-x-1/2 transition-colors duration-500",
                        done ? "bg-teal-500" : "bg-[var(--color-line)]"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isFailedHere
                        ? "border-rose-500 bg-rose-50 text-rose-600"
                        : done
                        ? "border-teal-500 bg-teal-500 text-white shadow-xs"
                        : active
                        ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] ring-4 ring-[var(--color-brand-50)]"
                        : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                    )}
                  >
                    {isFailedHere ? (
                      <XCircle className="size-4" />
                    ) : done ? (
                      <CheckCircle2 className="size-4" />
                    ) : active ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <span className="size-2 rounded-full bg-[var(--color-line)]" />
                    )}
                  </span>
                  <div className="pt-0.5">
                    <p
                      className={cn(
                        "text-[13px] font-semibold transition-colors",
                        active
                          ? "text-[var(--color-ink)]"
                          : done
                          ? "text-[var(--color-ink-soft)]"
                          : "text-[var(--color-muted)]"
                      )}
                    >
                      {s.label}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {step === "failed" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-[13px] text-rose-700">
              <p className="font-semibold">Pipeline Extraction Error</p>
              <p className="mt-1 text-[12px]">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--color-line)]">
            {step === "failed" && (
              <Button variant="secondary" onClick={reset}>
                Try another document
              </Button>
            )}
            {step === "completed" && documentId && (
              <>
                <Button variant="secondary" onClick={close}>
                  Dismiss
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    close();
                    navigate(`/documents/${documentId}`);
                  }}
                >
                  Inspect document <ArrowRight className="size-3.5" />
                </Button>
              </>
            )}
            {step === "failed" && (
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
