"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import clsx from "clsx";

type ToastVariant = "default" | "success" | "error" | "warning";

type ToastAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  dismissible?: boolean;
};

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  const value = useMemo<ToastContextValue>(() => ({ toasts, push, dismiss, clear }), [toasts, push, dismiss, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

type ToastViewportProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex flex-col items-end gap-3 px-4 sm:items-end sm:px-6">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

type ToastItemProps = {
  toast: Toast;
  onDismiss: (id: string) => void;
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const variant = toast.variant ?? "default";
  const bgClass =
    variant === "success"
      ? "bg-emerald-500/90 text-white"
      : variant === "error"
        ? "bg-red-500/90 text-white"
        : variant === "warning"
          ? "bg-amber-500/90 text-black"
          : "bg-slate-800/90 text-white";

  return (
    <div
      className={clsx(
        "pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 shadow-lg ring-1 ring-black/20 backdrop-blur",
        bgClass
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold leading-tight">{toast.title}</p>
          {toast.description ? <p className="text-xs leading-tight">{toast.description}</p> : null}
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2 inline-flex rounded-md border border-white/30 px-2 py-1 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        {(toast.dismissible ?? true) && (
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="-m-1 rounded-md p-1 text-xs opacity-70 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
