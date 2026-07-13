"use client";

import type { DownloadAllProgress } from "@/lib/download";

interface ProgressOverlayProps {
  progress: DownloadAllProgress | null;
  error: string | null;
}

export default function ProgressOverlay({
  progress,
  error,
}: ProgressOverlayProps) {
  if (!progress && !error) return null;

  const pct = progress
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : error
    ? 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm dark:bg-slate-950/80 animate-fade-in">
      <div className="w-[min(90vw,420px)] rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800 animate-scale-in">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <svg
                className="h-7 w-7 text-red-600 dark:text-red-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="text-center text-base font-semibold text-slate-900 dark:text-white">
              Gagal mengunduh foto
            </h3>
            <p className="mt-2 break-words text-center text-sm text-slate-500 dark:text-slate-400">
              {error}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 animate-pulse-glow">
              <svg
                className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-center text-base font-semibold text-slate-900 dark:text-white">
              Mengunduh foto...
            </h3>
            <p className="mt-1 truncate text-center text-xs text-slate-500 dark:text-slate-400">
              {progress?.current}
            </p>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
              {progress?.done} / {progress?.total} foto · {pct}%
            </p>
          </>
        )}
      </div>
    </div>
  );
}
