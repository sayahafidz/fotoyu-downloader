"use client";

import { useState } from "react";

const BOOKMARKLET_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "1. HP Android (Chrome / Samsung Internet)",
    body:
      "Salin kode bookmarklet di atas. Buat bookmark baru di Chrome dengan URL kode tersebut dan beri nama 'fotoyu'. Buka fotoyu.com, ketik 'fotoyu' di address bar, lalu ketuk bookmark.",
  },
  {
    title: "2. HP Android (Kiwi Browser / Ekstensi)",
    body:
      "Gunakan Kiwi Browser dengan Tampermonkey / Violentmonkey. Pasang userscript fotoyu (1-klik). Tombol '⚡ Download Foto' akan otomatis muncul di pojok kanan bawah saat buka fotoyu.com.",
  },
  {
    title: "3. Laptop / PC (DevTools Console)",
    body:
      "Buka fotoyu.com di browser PC. Tekan F12 → pilih tab Console. Paste kode Console di atas dan tekan Enter. Halaman akan otomatis redirect ke downloader ini.",
  },
  {
    title: "4. Download Foto di Galeri HP",
    body:
      "Setelah foto muncul di preview, kamu bisa memilih 'Galeri HP (Langsung)' untuk menyimpan foto satu per satu tanpa ekstrak ZIP, atau pilih 'File ZIP'.",
  },
];

const JSON_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Pilih foto di aplikasi fotoyu",
    body:
      "Buka aplikasi fotoyu atau web fotoyu.com. Pilih foto-foto yang ingin di-download, lalu tambahkan ke keranjang belanja (cart).",
  },
  {
    title: "Buka web fotoyu (Mode HP di DevTools)",
    body:
      "Buka browser laptop, tekan F12 → toggle device toolbar (Ctrl+Shift+M) untuk mode tampilan HP. Kunjungi fotoyu.com dan login dengan akun yang sama.",
  },
  {
    title: "Buka cart dan tangkap response API",
    body:
      "Buka keranjang. Di DevTools → tab Network → filter Fetch/XHR. Cari request ke endpoint: carts/preview",
  },
  {
    title: "Salin response & Paste",
    body:
      "Klik request-nya → tab Response → Copy response (atau salin manual teks JSON-nya). Lalu paste ke kotak di atas dan klik tombol Proses.",
  },
];

const TOKEN_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Login ke fotoyu.com",
    body:
      "Buka fotoyu.com di browser HP atau PC. Login dengan akunmu. Pastikan foto-foto sudah ditambahkan ke cart sebelumnya.",
  },
  {
    title: "Ambil Token di HP / PC",
    body:
      "Di HP: Jalankan 'javascript:prompt(localStorage.getItem(\"persist:root\"))' di address bar. Di PC: F12 → Storage / Application → Local Storage → persist:root.",
  },
  {
    title: "Paste di kotak Login Token",
    body:
      "Paste seluruh value persist:root ke kotak input di atas, lalu klik 'Ambil cart'. Sistem akan otomatis mengekstrak access_token dan mengambil foto.",
  },
  {
    title: "Tersimpan Otomatis",
    body:
      "Data token disimpan aman di memori browser lokal kamu sehingga kamu tidak perlu login ulang setiap kali membuka downloader.",
  },
];

const ENHANCE_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Download foto dulu",
    body:
      "Gunakan tab '1-Klik' atau 'Login Token' untuk mengunduh foto dari cart fotoyu. Tab prompt AI ini untuk mempercantik foto yang sudah kamu download.",
  },
  {
    title: "Pilih varian prompt",
    body:
      "Pilih salah satu varian: Indonesia Lengkap, English Full (paling kompatibel untuk AI luar), atau Indonesia Singkat untuk penggunaan cepat.",
  },
  {
    title: "Copy prompt atau download .txt",
    body:
      "Klik 'Copy prompt' untuk menyalin ke clipboard, atau 'Download .txt' untuk menyimpan sebagai file. Lalu buka ChatGPT, Gemini, atau AI image editor favoritmu.",
  },
  {
    title: "Upload foto + paste prompt",
    body:
      "Di AI editor: upload foto hasil download, paste prompt tadi, lalu jalankan. AI akan memperjelas detail wajah, pencahayaan, dan membersihkan noise.",
  },
];

interface HelpSectionProps {
  mode?: "bookmarklet" | "token" | "paste" | "enhance";
  onOpenAndroidGuide?: () => void;
}

export default function HelpSection({ mode = "bookmarklet", onOpenAndroidGuide }: HelpSectionProps) {
  const [open, setOpen] = useState(false);

  const steps = 
    mode === "bookmarklet" ? BOOKMARKLET_STEPS :
    mode === "token" ? TOKEN_STEPS : 
    mode === "paste" ? JSON_STEPS : 
    ENHANCE_STEPS;
    
  const label =
    mode === "bookmarklet"
      ? "📚 Panduan Lengkap: Cara Pakai di HP Android & PC"
      : mode === "token"
      ? "📚 Panduan: Cara Mendapatkan Token Login"
      : mode === "paste"
      ? "📚 Panduan: Cara Mendapatkan Response JSON"
      : "📚 Panduan: Cara Mempercantik Foto dengan AI";

  return (
    <section className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80"
      >
        <span className="inline-flex items-center gap-2">
          <InfoIcon />
          {label}
        </span>
        <svg
          className={[
            "h-4 w-4 text-slate-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 space-y-3 animate-fade-in">
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400">
                    {i + 1}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {s.title}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>

          {onOpenAndroidGuide && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={onOpenAndroidGuide}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <span>📱</span>
                <span>Buka Panduan Bergambar Khusus Android</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InfoIcon() {
  return (
    <svg
      className="h-4 w-4 text-indigo-500"
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
