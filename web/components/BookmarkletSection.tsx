"use client";

import { useState } from "react";

// Domain this app is served from. Configurable via NEXT_PUBLIC_APP_URL so the
// same image works for Vercel deploys (fakyu.sayahafidz.my.id) and self-hosted
// Docker deployments (fotoyu.example.com). Falls back to the current origin
// if the env var is not set (e.g. during local dev).
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

// Bookmarklet yang jalan di fotoyu.com.
// Langkah 1: coba fetch cart preview LANGSUNG dari origin fotoyu.com
//            (same-site, jadi browser otomatis mengirim cookie + fingerprint).
// Langkah 2: kalau berhasil, redirect ke web app dengan data cart di hash.
// Langkah 3: kalau gagal, fallback ke cara lama (kirim persist:root via hash).
//
// Hash (#fragment) TIDAK dikirim ke server, jadi data tetap client-side.
const BOOKMARKLET_CODE = `javascript:(function(){
  try {
    var APP_URL = '${APP_URL}';
    function fallback() {
      var v = localStorage.getItem('persist:root');
      if (!v) { alert('persist:root tidak ditemukan. Pastikan kamu sudah login di fotoyu.com.'); return; }
      location.href = APP_URL + '/#t=' + encodeURIComponent(v);
    }
    fetch('https://api.fotoyu.com/gs/v1/carts/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
      body: JSON.stringify({page:1,limit:100,selected_products:[]}),
      credentials: 'include'
    })
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,json:j}; }); })
    .then(function(o){
      if (o.ok && o.json && o.json.result && Array.isArray(o.json.result.data)) {
        location.href = APP_URL + '/#cart=' + encodeURIComponent(JSON.stringify(o.json));
      } else {
        fallback();
      }
    })
    .catch(function(){ fallback(); });
  } catch (e) { alert('Error: ' + e.message); }
})();`;

interface BookmarkletSectionProps {
  onTokenReceived?: (token: string) => void;
}

export default function BookmarkletSection({
  onTokenReceived,
}: BookmarkletSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <BoltIcon />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">
              Cara cepat: pakai bookmarklet (1 klik)
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
              Drag tombol di bawah ke bookmark bar browser kamu. Setelah login
              di fotoyu.com, cukup klik bookmark tersebut — fotonya akan otomatis
              muncul di web app ini tanpa perlu paste token.
            </p>
          </div>

          {/* Drag-to-bookmarkbar link */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={BOOKMARKLET_CODE}
              onClick={(e) => {
                // Klik biasa tidak akan jalan di browser modern (security).
                // Tampilkan instruksi copy sebagai gantinya.
                e.preventDefault();
                handleCopy();
              }}
              draggable
              onDragStart={(e) => {
                // Saat drag, browser akan pakai href sebagai data.
                // Ini cara utama untuk "install" bookmarklet.
              }}
              className="inline-flex cursor-grab items-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 active:cursor-grabbing"
              title="Drag ini ke bookmark bar browser kamu"
            >
              <DragIcon />
              Ambil cart fotoyu
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Tersalin!" : "Copy kode"}
            </button>
          </div>

          {/* Step-by-step */}
          <ol className="space-y-1.5 text-xs text-emerald-800">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800">
                1
              </span>
              <span className="leading-relaxed">
                Pastikan <strong>bookmark bar</strong> browser terlihat
                (Ctrl+Shift+B di Chrome/Edge).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800">
                2
              </span>
              <span className="leading-relaxed">
                <strong>Drag</strong> tombol{" "}
                <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px]">
                  Ambil cart fotoyu
                </code>{" "}
                di atas ke bookmark bar.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800">
                3
              </span>
              <span className="leading-relaxed">
                Buka{" "}
                <a
                  href="https://fotoyu.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline hover:text-emerald-900"
                >
                  fotoyu.com
                </a>{" "}
                dan login.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800">
                4
              </span>
              <span className="leading-relaxed">
                Klik bookmark <strong>Ambil cart fotoyu</strong> di bookmark bar.
                Kamu otomatis kembali ke sini dengan data login terisi.
              </span>
            </li>
          </ol>

          <p className="rounded-lg bg-white/60 p-2.5 text-[11px] leading-relaxed text-emerald-700">
            <strong>Privasi:</strong> bookmarklet memanggil API fotoyu.com
            langsung dari browser kamu, lalu membawa hasilnya ke web app ini via
            URL hash (<code className="font-mono">#cart=...</code>). Hash tidak
            dikirim ke server, jadi data tetap di browser kamu.
          </p>
        </div>
      </div>
    </div>
  );
}

function BoltIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function DragIcon() {
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
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
