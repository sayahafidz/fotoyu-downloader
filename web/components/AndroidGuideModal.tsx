"use client";

import { useState } from "react";
import { useDialog } from "@/lib/use-dialog";

interface AndroidGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AndroidTab = "chrome" | "kiwi" | "quick" | "termux";

export default function AndroidGuideModal({ isOpen, onClose }: AndroidGuideModalProps) {
  const [tab, setTab] = useState<AndroidTab>("chrome");
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [copiedQuickSnippet, setCopiedQuickSnippet] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://fakyu.sayahafidz.my.id";

  const bookmarkletCode = `javascript:(function(){var s=document.createElement('script');s.src='${appUrl}/android-inject.js?t='+Date.now();document.body.appendChild(s);})();`;

  const quickSnippet = `javascript:(function(){var r=localStorage.getItem('persist:root');if(!r){alert('Belum login di fotoyu!');return;}prompt('Salin data token fotoyu:',r);})();`;

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch { setCopyError("Tidak dapat menyalin. Pilih teks kode dan salin secara manual."); }
  };

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="android-guide-title" tabIndex={-1}
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-sheet themed-tool max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 id="android-guide-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                Panduan Android
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download foto fotoyu langsung dari smartphone tanpa perlu laptop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-quiet shrink-0" aria-label="Tutup panduan"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-950 overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setTab("chrome")}
            aria-pressed={tab === "chrome"}
            className={[
              "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
              tab === "chrome"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            <span>🌐</span> Chrome & Samsung
          </button>
          <button
            type="button"
            onClick={() => setTab("kiwi")}
            aria-pressed={tab === "kiwi"}
            className={[
              "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
              tab === "kiwi"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            <span>⚡</span> Kiwi Browser (1-Klik)
          </button>
          <button
            type="button"
            onClick={() => setTab("quick")}
            aria-pressed={tab === "quick"}
            className={[
              "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
              tab === "quick"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            <span>📋</span> Salin Token Cepat
          </button>
          <button
            type="button"
            onClick={() => setTab("termux")}
            aria-pressed={tab === "termux"}
            className={[
              "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
              tab === "termux"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            <span>💻</span> Termux (CLI)
          </button>
        </div>

        {/* Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {copyError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{copyError}</p>}
          {tab === "chrome" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Cara Pakai di Chrome Android / Samsung Internet:
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-indigo-900/80 dark:text-indigo-300">
                  Di Android Chrome tidak ada tombol F12, tetapi kamu bisa menjalankan Bookmarklet via Address Bar!
                </p>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400 text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Salin kode bookmarklet di bawah:</p>
                    <div className="mt-2 relative">
                      <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-200 break-all pr-20">
                        {bookmarkletCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bookmarkletCode, setCopiedBookmarklet)}
                        className="absolute top-2 right-2 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                      >
                        {copiedBookmarklet ? "Tersalin!" : "Salin Kode"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400 text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Buat Bookmark di Chrome:</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Buka halaman sembarang di Chrome → Tekan titik 3 (⋮) → Tekan ikon Bintang (★ Bookmark) → Tekan <strong>Edit</strong> → Ganti Nama jadi <code>fotoyu</code> dan ganti URL dengan kode yang baru kamu salin tadi.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400 text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Jalankan di fotoyu.com:</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Buka <strong>fotoyu.com</strong> dan login → Tambahkan foto ke cart → Ketik <code>fotoyu</code> di Address Bar browser → Ketuk bookmark yang muncul → Halaman akan otomatis mengambil keranjang dan membuka fotoyu-downloader!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "kiwi" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                   Browser dengan ekstensi
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-300">
                  Gunakan browser Android yang mendukung ekstensi seperti <strong>Kiwi Browser</strong>, <strong>Firefox Android</strong>, atau <strong>Lemur Browser</strong>.
                </p>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400 text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Pasang ekstensi Tampermonkey / Violentmonkey:</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Buka Chrome Web Store di Kiwi Browser dan pasang <strong>Tampermonkey</strong> atau <strong>Violentmonkey</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400 text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Pasang Skrip Pembantu:</p>
                    <div className="mt-2">
                      <a
                        href="/fotoyu-mobile-helper.user.js"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
                      >
                        ⚡ Pasang Userscript Fotoyu (1-Klik)
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400 text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Buka fotoyu.com & Download:</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Saat membuka fotoyu.com, tombol mengambang <strong>"⚡ Download Foto"</strong> akan otomatis muncul di kanan bawah layar HP kamu!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "quick" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                <h4 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                  Salin Data Token Langsung dari Address Bar HP
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-blue-900/80 dark:text-blue-300">
                  Jika kamu ingin menyalin token login secara cepat tanpa bookmark permanen.
                </p>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <p className="text-slate-600 dark:text-slate-400">
                  1. Buka <strong>fotoyu.com</strong> di tab browser HP dan pastikan sudah login.
                  <br />
                  2. Ketik di Address Bar browser kode di bawah (pastikan tulisan <code>javascript:</code> tidak terhapus otomatis oleh browser):
                </p>

                <div className="relative">
                  <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-200 break-all pr-20">
                    {quickSnippet}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(quickSnippet, setCopiedQuickSnippet)}
                    className="absolute top-2 right-2 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    {copiedQuickSnippet ? "Tersalin!" : "Salin Kode"}
                  </button>
                </div>

                <p className="text-slate-600 dark:text-slate-400">
                  3. Popup kotak dialog akan muncul berisi seluruh data login fotoyu kamu. Salin teksnya dan paste ke tab <strong>"Login Token"</strong> di aplikasi ini!
                </p>
              </div>
            </div>
          )}

          {tab === "termux" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-950/30">
                <h4 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                   Downloader Python di Termux
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-purple-900/80 dark:text-purple-300">
                   Untuk pengguna yang terbiasa dengan terminal Android.
                </p>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">Perintah Cepat di Termux:</p>
                <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-emerald-400 overflow-x-auto space-y-2">
                  <p># 1. Update & pasang python + git</p>
                  <p className="text-slate-300">pkg update && pkg install python git -y</p>
                  <p># 2. Clone repo & install dependency</p>
                  <p className="text-slate-300">git clone https://github.com/sayahafidz/fotoyu-downloader.git</p>
                  <p className="text-slate-300">cd fotoyu-downloader && pip install -r requirements.txt</p>
                  <p># 3. Jalankan langsung dengan token atau response</p>
                  <p className="text-slate-300">python downloader.py --token &quot;TOKEN_KAMU&quot;</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
