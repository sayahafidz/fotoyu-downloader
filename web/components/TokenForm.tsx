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
      setShowValue(false);
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
    <form onSubmit={handleSubmit} className="import-panel space-y-4" aria-busy={loading}>
      <h2 className="text-xl font-semibold">Muat dengan token login</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">Tempel token Bearer atau data <code>persist:root</code> dari browser Fotoyu.</p>
      <div>
        <label
          htmlFor="token-input"
          className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2"
        >
           Data login Fotoyu
        </label>
        <div className="relative">
          <textarea
            id="token-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
             placeholder="Tempel data login di sini"
             autoComplete="off"
             autoCapitalize="off"
             disabled={loading}
            spellCheck={false}
            rows={5}
            className={
               "field pr-16 font-mono " + (showValue ? "" : "token-masked")
            }
          />
          <button
            type="button"
            onClick={() => setShowValue((v) => !v)}
             className="absolute right-2 top-2 btn-quiet"
             aria-pressed={showValue}
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
           className="btn-primary w-full"
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
             className="btn-quiet"
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
