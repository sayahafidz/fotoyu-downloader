"use client";

import type { DownloadAllProgress } from "@/lib/download";
import { useDialog } from "@/lib/use-dialog";

interface ProgressOverlayProps {
  progress: DownloadAllProgress | null;
  error: string | null;
  onClose?: () => void;
  onCancel?: () => void;
}

export default function ProgressOverlay({
  progress,
  error,
  onClose,
  onCancel,
}: ProgressOverlayProps) {
  const dialogRef = useDialog(Boolean(progress || error), error ? onClose : undefined);
  if (!progress && !error) return null;

  const pct = progress
     ? Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100))
    : error
    ? 100
    : 0;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={error ? "Unduhan gagal" : "Progres unduhan"} tabIndex={-1} className="dialog-backdrop">
      <div className="dialog-sheet max-w-md p-6">
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
            {onClose && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  Tutup
                </button>
              </div>
            )}
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
            <div role="progressbar" aria-label="Foto diproses" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full origin-left rounded-full bg-indigo-600 transition-transform duration-300"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
              {progress?.done} / {progress?.total} foto · {pct}%
            </p>
            {progress?.watermarkSuccess !== undefined && (
              <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                Watermark dihapus: {progress.watermarkSuccess} berhasil
                {progress.watermarkFailed ? `, ${progress.watermarkFailed} gagal` : ""}
              </p>
            )}
            {onCancel && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn-secondary w-full"
                >
                  Batalkan download
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
