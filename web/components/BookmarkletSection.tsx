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
    <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <BoltIcon />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-emerald-900">
                ⚡ Cara Termudah - 1 Klik Otomatis
              </h3>
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                RECOMMENDED
              </span>
            </div>
            <p className="text-sm leading-relaxed text-emerald-800">
              Cuma perlu setup <strong>1 kali</strong> (drag tombol ke bookmark), terus setiap kali mau download tinggal <strong>klik bookmark</strong> aja — langsung muncul fotonya! 🎉
            </p>
          </div>
        </div>

        {/* Drag Button - Make it prominent */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-emerald-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            👇 Drag tombol ini ke bookmark bar browser:
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={BOOKMARKLET_CODE}
              onClick={(e) => {
                e.preventDefault();
                handleCopy();
              }}
              draggable
              className="inline-flex cursor-grab items-center gap-2 rounded-xl border-2 border-dashed border-emerald-500 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl active:cursor-grabbing active:scale-95"
              title="Drag ini ke bookmark bar browser kamu"
            >
              <DragIcon />
              🚀 Ambil cart fotoyu
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "✓ Tersalin!" : "Copy kode"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            💡 Tip: Kalau drag tidak bisa, klik "Copy kode" lalu buat bookmark manual dan paste kode-nya.
          </p>
        </div>

        {/* Simple Steps */}
        <div className="rounded-xl bg-white/70 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Langkah mudah:
          </p>
          <ol className="space-y-2.5 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                1
              </span>
              <span className="leading-relaxed">
                Pastikan <strong>bookmark bar</strong> terlihat <span className="text-xs text-slate-500">(tekan Ctrl+Shift+B)</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                2
              </span>
              <span className="leading-relaxed">
                <strong>Drag</strong> tombol hijau di atas ke bookmark bar
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                3
              </span>
              <span className="leading-relaxed">
                Buka <a href="https://fotoyu.com" target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline hover:text-emerald-900">fotoyu.com</a> dan login
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                4
              </span>
              <span className="leading-relaxed">
                Klik bookmark yang tadi disimpan → <strong>Selesai!</strong> 🎉
              </span>
            </li>
          </ol>
        </div>

        {/* Privacy note - simplified */}
        <div className="rounded-lg bg-emerald-100/50 p-3 border border-emerald-200">
          <p className="text-xs leading-relaxed text-emerald-800">
            🔒 <strong>Aman &amp; Privat:</strong> Data tidak dikirim ke server lain, langsung dari fotoyu.com ke browser kamu.
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
