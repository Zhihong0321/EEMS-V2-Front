"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
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
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
    
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
    <div 
      className="pointer-events-none fixed inset-x-0 bottom-0 sm:top-20 sm:bottom-auto z-50 flex flex-col items-center sm:items-end gap-3 px-4 sm:px-6 pb-6 sm:pb-0"
      aria-live="polite"
      aria-atomic="true"
    >
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
  const [isVisible, setIsVisible] = useState(false);
  const variant = toast.variant ?? "default";
  
  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => setIsVisible(true));
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 200);
  };
  
  const variantStyles =
    variant === "success"
      ? "bg-success/95 text-white border-success/20"
      : variant === "error"
        ? "bg-danger/95 text-white border-danger/20"
        : variant === "warning"
          ? "bg-warning/95 text-white border-warning/20"
          : "bg-slate-800/95 text-white border-slate-700/20";
  
  const Icon = 
    variant === "success" ? CheckCircleIcon
    : variant === "error" ? XCircleIcon
    : variant === "warning" ? ExclamationTriangleIcon
    : InformationCircleIcon;

  return (
    <div
      className={clsx(
        "pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 shadow-2xl border backdrop-blur-md transition-all duration-300 ease-out",
        variantStyles,
        isVisible 
          ? "translate-y-0 opacity-100" 
          : "translate-y-2 sm:translate-y-0 sm:translate-x-4 opacity-0"
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{toast.title}</p>
          {toast.description && (
            <p className="text-xs leading-tight opacity-90">{toast.description}</p>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                handleDismiss();
              }}
              className="mt-2 inline-flex rounded-md border border-current/30 px-3 py-1.5 text-xs font-semibold transition hover:border-current hover:bg-white/10"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        {(toast.dismissible ?? true) && (
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-md p-1 transition hover:bg-white/10"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
