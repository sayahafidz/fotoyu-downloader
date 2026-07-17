"use client";

import { useState } from "react";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const CONSOLE_CODE = `(function(){
  var APP_URL = "${APP_URL}";
  function fallback() {
    var v = localStorage.getItem("persist:root");
    if (!v) { alert("persist:root tidak ditemukan."); return; }
    location.href = APP_URL + "/#t=" + encodeURIComponent(v);
  }
  var root = localStorage.getItem("persist:root");
  var token = null;
  if (root) {
    try {
      var parsed = JSON.parse(root);
      var userStr = parsed.user;
      if (typeof userStr === "string") {
        var user = JSON.parse(userStr);
        if (user && user.access_token) { token = user.access_token; }
      }
    } catch(e) {}
  }
  if (!token) { fallback(); return; }
  fetch("https://api.fotoyu.com/gs/v1/carts/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/plain, */*",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({page:1,limit:100,selected_products:[]})
  })
  .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,json:j}; }); })
  .then(function(o){
    if (o.ok && o.json && o.json.result && Array.isArray(o.json.result.data)) {
      location.href = APP_URL + "/#cart=" + encodeURIComponent(JSON.stringify(o.json));
    } else { fallback(); }
  })
  .catch(function(){ fallback(); });
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
      await navigator.clipboard.writeText(CONSOLE_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md">
            <BoltIcon />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-indigo-900">
                Console Copy-Paste di fotoyu.com
              </h3>
              <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                RECOMMENDED
              </span>
            </div>
            <p className="text-sm leading-relaxed text-indigo-800">
              Copy kode di bawah, paste ke <strong>Console</strong> browser saat buka fotoyu.com dalam mode mobile display.
            </p>
          </div>
        </div>

        {/* Code box */}
        <div className="relative">
          <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto">
            <pre className="text-xs text-slate-100 font-mono whitespace-pre-wrap break-all">
              {CONSOLE_CODE}
            </pre>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2 right-2 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 transition-colors"
          >
            {copied ? "Tersalin!" : "Copy"}
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Cara pakai:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600">
            <li>Buka fotoyu.com di browser laptop/desktop</li>
            <li>Tekan <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs font-mono">F12</kbd> untuk buka DevTools</li>
            <li>Klik ikon device toolbar (atau tekan <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs font-mono">Ctrl+Shift+M</kbd>) untuk mode mobile</li>
            <li>Pilih tab <strong>Console</strong></li>
            <li>Copy kode di atas dan paste ke Console, tekan Enter</li>
            <li>Halaman akan otomatis redirect ke web app ini dengan cart kamu</li>
          </ol>
        </div>

        {/* Note */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-900">
            <strong>Catatan:</strong> Pastikan sudah login di fotoyu.com sebelum menjalankan kode. Kode ini akan otomatis mengambil token dari localStorage dan fetch data cart kamu.
          </p>
        </div>
      </div>
    </div>
  );
}

function BoltIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

