"use client";

interface EmptyStateProps {
  message?: string;
  searchQuery?: string;
  onReset?: () => void;
}

export default function EmptyState({
  message = "Tidak ada foto ditemukan.",
  searchQuery,
  onReset,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <svg
          className="h-10 w-10 text-slate-400 dark:text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
        {searchQuery ? "Tidak ada foto yang cocok" : "Cart kosong"}
      </h3>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {searchQuery
          ? `Tidak ditemukan foto dengan kata kunci "${searchQuery}".`
          : message}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Kembali
        </button>
      )}
    </div>
  );
}
