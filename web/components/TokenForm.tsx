"use client";

import { useState } from "react";

interface TokenFormProps {
  onFetchCart: (token: string) => void;
  loading: boolean;
}

export default function TokenForm({ onFetchCart, loading }: TokenFormProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) onFetchCart(token.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full animate-fade-in space-y-4">
      <div className="rounded-2xl border-2 border-slate-300 bg-white p-6 transition-colors hover:border-slate-400">
        <label htmlFor="token-input" className="block text-sm font-medium text-slate-700 mb-2">
          Bearer Token dari fotoyu
        </label>
        <div className="relative">
          <input
            id="token-input"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token disini (mis. eyJhbGc...)"
            spellCheck={false}
            className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showToken ? "Sembunyikan token" : "Tampilkan token"}
          >
            {showToken ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {token.trim() && (
          <p className="mt-2 text-xs text-slate-500">
            Token akan disimpan di browser agar tidak perlu paste ulang.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !token.trim()}
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

        {token.trim() && (
          <button
            type="button"
            onClick={() => setToken("")}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Bersihkan
          </button>
        )}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <InfoIcon />
          <div className="flex-1 space-y-2 text-sm">
            <p className="font-medium text-blue-900">
              Cara mendapatkan Bearer token:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 leading-relaxed">
              <li>Login ke <a href="https://fotoyu.com" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">fotoyu.com</a> (tab baru)</li>
              <li>Tekan <kbd className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">F12</kbd> → buka tab <strong>Application</strong></li>
              <li>Sidebar kiri: <strong>Storage</strong> → <strong>Local Storage</strong> → <strong>https://fotoyu.com</strong></li>
              <li>Cari key <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">access_token</code> atau <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">token</code></li>
              <li>Copy value-nya (klik kanan → Copy) → paste ke kotak di atas</li>
            </ol>
            <p className="text-xs text-blue-700 mt-2">
              Token biasanya berlaku beberapa jam. Jika gagal, ambil token baru.
            </p>
          </div>
        </div>
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

function InfoIcon() {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
