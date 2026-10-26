import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5 py-1">
        {danger && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
            <AlertTriangle className="size-5" />
          </div>
        )}
        <p className="text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          {description}
        </p>
      </div>
    </Modal>
  );
}
