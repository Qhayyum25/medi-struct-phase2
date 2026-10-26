import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileStack,
  Upload,
  Trash2,
  Eye,
  PlayCircle,
  FileText,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { documentsApi } from "../../api/documents";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { UploadDialog } from "../../components/domain/UploadDialog";
import { ConfirmDialog } from "../../components/domain/ConfirmDialog";
import { formatBytes, formatDateTime } from "../../lib/format";
import { describeError } from "../../lib/errors";
import { useToast } from "../../context/ToastContext";
import type { DocumentStatus, FileType } from "../../types/api";

const PAGE_SIZE = 10;

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DocumentStatus | "">("");
  const [fileType, setFileType] = useState<FileType | "">("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; filename: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const qc = useQueryClient();
  const toast = useToast();

  const params = {
    page,
    page_size: PAGE_SIZE,
    status: status || undefined,
    file_type: fileType || undefined,
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["documents", params],
    queryFn: () => documentsApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      toast("Document deleted.", "success");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setPendingDelete(null);
    },
    onError: (err) => toast(describeError(err), "error"),
  });

  async function handleProcess(id: string) {
    setProcessingId(id);
    try {
      await documentsApi.process(id);
      toast("Processing completed successfully.", "success");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast(describeError(err), "error");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Documents"
        description="Every uploaded clinical encounter, pathology note, or discharge summary with its de-identification and extraction status."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => refetch()}
              title="Refresh list"
              disabled={isFetching}
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="primary" onClick={() => setUploadOpen(true)}>
              <Upload className="size-3.5" /> Upload document
            </Button>
          </div>
        }
      />

      <Card>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/50 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--color-ink-soft)]">
              <SlidersHorizontal className="size-3.5 text-[var(--color-muted)]" />
              <span>Filters:</span>
            </div>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as DocumentStatus | "");
                setPage(1);
              }}
              className="!h-9 w-44 text-[13px]"
            >
              <option value="">All statuses</option>
              {(
                ["uploaded", "extracted", "deidentified", "processing", "completed", "failed"] as DocumentStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
            <Select
              value={fileType}
              onChange={(e) => {
                setFileType(e.target.value as FileType | "");
                setPage(1);
              }}
              className="!h-9 w-36 text-[13px]"
            >
              <option value="">All file types</option>
              <option value="pdf">PDF Document</option>
              <option value="docx">Word DOCX</option>
              <option value="txt">Plain Text</option>
            </Select>
            {(status || fileType) && (
              <button
                onClick={() => {
                  setStatus("");
                  setFileType("");
                  setPage(1);
                }}
                className="text-[12px] font-semibold text-[var(--color-brand-600)] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {data && (
            <span className="text-[12px] text-[var(--color-muted)]">
              <strong className="text-[var(--color-ink)] font-semibold">{data.total}</strong> total documents
            </span>
          )}
        </div>

        {isError ? (
          <ErrorState message="Could not load clinical documents list." onRetry={() => refetch()} />
        ) : isLoading ? (
          <SkeletonRows rows={6} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title={status || fileType ? "No matching documents found" : "No clinical documents uploaded"}
            description={
              status || fileType
                ? "Try adjusting or clearing your filters."
                : "Upload clinical narratives, discharge summaries, or notes to run information extraction."
            }
            action={
              !(status || fileType) && (
                <Button variant="primary" onClick={() => setUploadOpen(true)}>
                  <Upload className="size-3.5" /> Upload document
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-canvas)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    <th className="px-5 py-3">Document Title</th>
                    <th className="px-5 py-3">Format</th>
                    <th className="px-5 py-3">File Size</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Uploaded Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {data!.items.map((doc) => (
                    <tr
                      key={doc.id}
                      className="group transition-colors hover:bg-[var(--color-canvas)]"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="flex items-center gap-2.5 font-medium text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)]"
                        >
                          <span className="flex size-7 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] group-hover:border-[var(--color-brand-200)] group-hover:text-[var(--color-brand-600)] transition-colors">
                            <FileText className="size-3.5" />
                          </span>
                          <span className="truncate max-w-[280px]">{doc.filename}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded bg-[var(--color-canvas)] border border-[var(--color-line)] px-2 py-0.5 font-mono text-[11px] uppercase font-semibold text-[var(--color-muted)]">
                          {doc.file_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] tabular text-[var(--color-muted)]">
                        {formatBytes(doc.file_size)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-[var(--color-muted)]">
                        {formatDateTime(doc.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.status !== "completed" && doc.status !== "processing" && (
                            <button
                              title="Execute clinical extraction pipeline"
                              disabled={processingId === doc.id}
                              onClick={() => handleProcess(doc.id)}
                              className="flex size-7 items-center justify-center rounded-lg text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] disabled:opacity-50 transition-colors"
                            >
                              <PlayCircle className="size-4" />
                            </button>
                          )}
                          <Link
                            to={`/documents/${doc.id}`}
                            title="Inspect document"
                            className="flex size-7 items-center justify-center rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <button
                            title="Delete document"
                            onClick={() =>
                              setPendingDelete({ id: doc.id, filename: doc.filename })
                            }
                            className="flex size-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <UploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          qc.invalidateQueries({ queryKey: ["documents"] });
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete clinical document"
        description={`This will permanently delete "${pendingDelete?.filename}" and all entities, relations, and observations extracted from it. This action cannot be reversed.`}
        confirmLabel="Delete document"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
