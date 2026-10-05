"use client";

interface EmptyStateProps {
  message?: string;
  searchQuery?: string;
  onReset?: () => void;
}

export default function EmptyState({
  message = "Tidak ada foto yang ditemukan.",
  searchQuery,
  onReset,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center animate-fade-in">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-inner">
        <svg
          className="h-10 w-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
        {searchQuery ? "Tidak ada foto yang cocok" : "Keranjang Belum Memiliki Foto"}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {searchQuery
          ? `Tidak ditemukan foto dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
          : message}
      </p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <span>✕</span>
          <span>Reset Pencarian</span>
        </button>
      )}
    </div>
  );
}
