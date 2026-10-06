"use client";

import { useState } from "react";

const consoleCode = (appUrl: string) => `(function(){
  var APP_URL = ${JSON.stringify(appUrl)};
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

const androidBookmarklet = (appUrl: string) => `javascript:(function(){var s=document.createElement('script');s.src=${JSON.stringify(appUrl + "/android-inject.js")}+'?t='+Date.now();document.body.appendChild(s);})();`;

interface BookmarkletSectionProps {
  onTokenReceived?: (token: string) => void;
  onOpenAndroidGuide?: () => void;
}

export default function BookmarkletSection({
  onTokenReceived,
  onOpenAndroidGuide,
}: BookmarkletSectionProps) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const CONSOLE_CODE = consoleCode(appUrl);
  const ANDROID_BOOKMARKLET = androidBookmarklet(appUrl);
  const [activeTab, setActiveTab] = useState<"android" | "kiwi" | "pc">("android");
  const [copiedAndroid, setCopiedAndroid] = useState(false);
  const [copiedConsole, setCopiedConsole] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopyAndroid = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(ANDROID_BOOKMARKLET);
      setCopiedAndroid(true);
      setTimeout(() => setCopiedAndroid(false), 2000);
    } catch { setCopyError("Tidak dapat menyalin otomatis. Pilih dan salin kode di bawah."); }
  };

  const handleCopyConsole = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(CONSOLE_CODE);
      setCopiedConsole(true);
      setTimeout(() => setCopiedConsole(false), 2000);
    } catch { setCopyError("Tidak dapat menyalin otomatis. Pilih dan salin kode di bawah."); }
  };

  return (
    <div className="import-panel">
      <h2 className="text-xl font-semibold">Hubungkan keranjang Fotoyu</h2>
      <p className="mt-2 mb-5 text-sm text-slate-600 dark:text-slate-400">Siapkan bookmark sekali, lalu jalankan saat membuka keranjang di Fotoyu. Pilih browser yang kamu gunakan.</p>
      <div className="space-y-4">
        {/* Device Switcher Segmented Control */}
        <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("android")}
            className={[
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs sm:text-sm font-bold transition-all active:scale-95",
              activeTab === "android"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kiwi")}
            className={[
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs sm:text-sm font-bold transition-all active:scale-95",
              activeTab === "kiwi"
                ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            <span>Ekstensi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pc")}
            className={[
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs sm:text-sm font-bold transition-all active:scale-95",
              activeTab === "pc"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            <span>Laptop</span>
          </button>
        </div>

        {/* Tab 1: Android Chrome & Samsung */}
        {activeTab === "android" && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl bg-indigo-50/70 p-3.5 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                   Siapkan bookmark di Chrome Android
                </p>
                <p className="text-[11px] sm:text-xs text-indigo-900/80 dark:text-indigo-300">
                   Salin kode ini dan simpan sebagai URL bookmark bernama <code className="font-mono font-bold">fotoyu</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyAndroid}
                className="btn-primary"
              >
                <CopyIcon />
                <span>{copiedAndroid ? "Kode tersalin" : "Salin kode bookmark"}</span>
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-1">
              <li>Di Chrome HP: Bookmark sembarang web lalu Edit URL jadi kode yang kamu salin.</li>
              <li>Buka <strong>fotoyu.com</strong>, login & isi keranjang foto.</li>
               <li>Ketik <code className="font-mono font-bold text-slate-800 dark:text-slate-200">fotoyu</code> di bilah alamat Chrome, lalu ketuk bookmark. Foto akan dimuat di sini.</li>
            </ol>
          </div>
        )}

        {/* Tab 2: Kiwi Browser Userscript */}
        {activeTab === "kiwi" && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl bg-emerald-50/70 p-3.5 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                   Gunakan browser yang mendukung ekstensi
                </p>
                <p className="text-[11px] sm:text-xs text-emerald-900/80 dark:text-emerald-300">
                  Pasang ekstensi Tampermonkey di Kiwi Browser untuk memunculkan tombol download di fotoyu.com.
                </p>
              </div>

              <a
                href="/fotoyu-mobile-helper.user.js"
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <span>Pasang Userscript</span>
              </a>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 pl-1">
              Setelah terpasang, tombol mengambang <strong>"⚡ Download Foto"</strong> akan otomatis muncul di kanan bawah saat membuka fotoyu.com.
            </p>
          </div>
        )}

        {/* Tab 3: Desktop PC Console */}
        {activeTab === "pc" && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Console Snippet (DevTools PC)
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Buka fotoyu.com di laptop → F12 → Tab Console → Paste kode ini → Enter.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyConsole}
                className="btn-primary"
              >
                <CopyIcon />
                <span>{copiedConsole ? "✓ Tersalin!" : "Salin Kode Console"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
      {copyError && <div className="mt-4 space-y-2"><p role="alert" className="text-sm text-red-700 dark:text-red-300">{copyError}</p><textarea aria-label="Kode untuk disalin manual" readOnly value={activeTab === "pc" ? CONSOLE_CODE : ANDROID_BOOKMARKLET} className="field h-32 font-mono" /></div>}
      {activeTab === "android" && onOpenAndroidGuide && <button type="button" className="btn-quiet mt-4" onClick={onOpenAndroidGuide}>Lihat panduan bookmark</button>}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}
