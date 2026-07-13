"use client";

import { useCallback, useEffect, useState } from "react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastInput {
  type: ToastItem["type"];
  message: string;
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((input: ToastInput) => {
    const id = String(++nextId);
    const item: ToastItem = { id, ...input };
    setToasts((prev) => [...prev, item]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3100);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const isError = toast.type === "error";
  const isSuccess = toast.type === "success";

  return (
    <div
      className="pointer-events-auto animate-slide-in-right rounded-xl border bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            isError ? "bg-red-100 dark:bg-red-900" : "",
            isSuccess ? "bg-emerald-100 dark:bg-emerald-900" : "",
            !isError && !isSuccess ? "bg-indigo-100 dark:bg-indigo-900" : "",
          ].join(" ")}
        >
          {isError ? (
            <svg className="h-3.5 w-3.5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <p className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          {toast.message}
        </p>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
