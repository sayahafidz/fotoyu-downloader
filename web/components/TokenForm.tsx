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

  // When the bookmarklet redirects back to this app with a token in the URL
  // hash, the parent page extracts it and passes it down via `pendingToken`.
  // We fill the textarea and auto-trigger cart fetch.
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
      <div className="rounded-2xl border-2 border-slate-300 bg-white p-6 transition-colors hover:border-slate-400">
        <label
          htmlFor="token-input"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Data login fotoyu (persist:root)
        </label>
        <div className="relative">
          <textarea
            id="token-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              "Paste seluruh value dari key persist:root disini...\n\n" +
              "Caranya:\n" +
              "1. Login ke fotoyu.com\n" +
              "2. F12 → Application → Local Storage → fotoyu.com\n" +
              "3. Cari key persist:root → klik kanan value → Copy\n" +
              "4. Paste di sini"
            }
            spellCheck={false}
            rows={6}
            className={
              "block w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 " +
              (showValue ? "" : "[&:not(:focus)]:blur-sm")
            }
          />
          <button
            type="button"
            onClick={() => setShowValue((v) => !v)}
            className="absolute right-3 top-3 rounded-md bg-white/80 p-1.5 text-slate-400 hover:text-slate-600 backdrop-blur-sm"
            aria-label={showValue ? "Sembunyikan" : "Tampilkan"}
          >
            {showValue ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {value.trim() && (
          <p className="mt-2 text-xs text-slate-500">
            Data akan disimpan di browser agar tidak perlu paste ulang. Backend hanya
            mengekstrak access_token dari data ini.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              Mengambil cart...
            </>
          ) : (
            <>
              <CartIcon />
              Ambil cart
            </>
          )}
        </button>

        {value.trim() && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Bersihkan
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
      strokeWidth="2"
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
      className="h-5 w-5"
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
      className="h-5 w-5"
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
