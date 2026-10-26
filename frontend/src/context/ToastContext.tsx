import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "../lib/cn";

type ToastTone = "success" | "error" | "info";
interface Toast { id: number; message: string; tone: ToastTone }

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

const ICON: Record<ToastTone, typeof CheckCircle2> = { success: CheckCircle2, error: XCircle, info: Info };
const TONE_CLASS: Record<ToastTone, string> = {
  success: "border-teal-100 bg-teal-50 text-teal-700",
  error: "border-rose-500/20 bg-rose-50 text-rose-700",
  info: "border-brand-200 bg-brand-50 text-brand-700",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex w-80 items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] shadow-panel animate-[toast-in_0.18s_ease-out]",
                TONE_CLASS[t.tone],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} className="opacity-60 hover:opacity-100">
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
