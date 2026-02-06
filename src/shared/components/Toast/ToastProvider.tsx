import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ToastContext } from "./ToastContext";
import type { Toast } from "./toast.types";

const DEFAULT_DURATION_MS = 5000;

function generateToastId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type ToastProviderProps = {
  children: React.ReactNode;
  defaultDurationMs?: number;
  maxToasts?: number;
};

export function ToastProvider({
  children,
  defaultDurationMs = DEFAULT_DURATION_MS,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));

    const timerId = timersRef.current.get(id);
    if (timerId != null) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, durationMs?: number) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const id = generateToastId();
      const finalDuration = Math.max(0, durationMs ?? defaultDurationMs);

      const toast: Toast = {
        id,
        message: trimmed,
        durationMs: finalDuration,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        const next = [toast, ...prev];

        if (next.length > maxToasts) {
          const dropped = next.slice(maxToasts);
          for (const d of dropped) {
            const timerId = timersRef.current.get(d.id);
            if (timerId != null) {
              window.clearTimeout(timerId);
              timersRef.current.delete(d.id);
            }
          }
          return next.slice(0, maxToasts);
        }

        return next;
      });

      if (finalDuration > 0) {
        const timerId = window.setTimeout(() => removeToast(id), finalDuration);
        timersRef.current.set(id, timerId);
      }
    },
    [defaultDurationMs, maxToasts, removeToast],
  );

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-lg"
          >
            <p className="min-w-0 flex-1 wrap-break-word text-sm text-slate-900">
              {t.message}
            </p>

            <button
              type="button"
              aria-label="Dismiss toast"
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
