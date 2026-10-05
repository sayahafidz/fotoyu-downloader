"use client";

import { useEffect, useState } from "react";

interface TokenFormProps {
  onFetchCart: (token: string) => void;
  loading: boolean;
  pendingToken?: string | null;
  onPendingTokenConsumed?: () => void;
}

export default function TokenForm({
  onFetchCart,
  loading,
  pendingToken,
  onPendingTokenConsumed,
}: TokenFormProps) {
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);

  useEffect(() => {
    if (pendingToken) {
      setValue(pendingToken);
      setShowValue(true);
      onPendingTokenConsumed?.();
      onFetchCart(pendingToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onFetchCart(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full animate-fade-in space-y-4">
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-6 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 shadow-sm">
        <label
          htmlFor="token-input"
          className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2"
        >
          Data Login Fotoyu (Value <code className="text-indigo-600 dark:text-indigo-400 font-mono">persist:root</code> atau Token Bearer)
        </label>
        <div className="relative">
          <textarea
            id="token-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              "Paste value persist:root atau Bearer token di sini...\n\n" +
              "Cara di HP Android:\n" +
              "1. Login ke fotoyu.com di tab browser HP\n" +
              "2. Jalankan: javascript:prompt(localStorage.getItem('persist:root')) di Address Bar\n" +
              "3. Salin hasilnya dan paste di sini"
            }
            spellCheck={false}
            rows={5}
            className={
              "block w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs sm:text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 transition-colors " +
              (showValue ? "" : "[&:not(:focus)]:blur-sm")
            }
          />
          <button
            type="button"
            onClick={() => setShowValue((v) => !v)}
            className="absolute right-3 top-3 rounded-xl bg-white/80 p-2 text-slate-400 hover:text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-white backdrop-blur-sm transition-colors active:scale-95"
            aria-label={showValue ? "Sembunyikan" : "Tampilkan"}
          >
            {showValue ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {value.trim() && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Token disimpan di browser Anda secara lokal agar tidak perlu paste ulang setiap kunjungan.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              Mengambil data cart...
            </>
          ) : (
            <>
              <CartIcon />
              Ambil Keranjang Foto
            </>
          )}
        </button>

        {value.trim() && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Bersihkan Input
          </button>
        )}
      </div>
    </form>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
