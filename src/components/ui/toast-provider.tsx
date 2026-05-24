"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneClasses: Record<ToastTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  error: "border-danger/25 bg-danger/10 text-danger",
  info: "border-blue/25 bg-blue/10 text-blue"
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }].slice(-4));
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-24 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => (
          <div
            className={cn(
              "rounded-3xl border bg-surface/95 p-4 shadow-premium backdrop-blur-xl",
              toneClasses[toast.tone]
            )}
            key={toast.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm leading-5 opacity-80">{toast.description}</p>
                ) : null}
              </div>
              <button
                aria-label="Dismiss notification"
                className="rounded-full p-1 opacity-70 transition hover:bg-foreground/10 hover:opacity-100"
                onClick={() => removeToast(toast.id)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider.");
  return context;
}
