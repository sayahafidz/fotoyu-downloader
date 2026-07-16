"use client";

import { useState } from "react";

const BOOKMARKLET_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Tampilkan bookmark bar browser",
    body:
      "Tekan Ctrl+Shift+B (Windows) atau Cmd+Shift+B (Mac) untuk menampilkan bookmark bar di bagian atas browser. Jika sudah terlihat, skip langkah ini.",
  },
  {
    title: "Drag tombol ke bookmark bar",
    body:
      "Lihat tombol hijau 'Ambil cart fotoyu' di bawah. Klik tahan tombol tersebut, lalu drag (geser) ke bookmark bar browser kamu. Lepaskan mouse untuk menyimpannya sebagai bookmark.",
  },
  {
    title: "Login ke fotoyu.com",
    body:
      "Buka tab baru, kunjungi fotoyu.com dan login dengan akunmu. Pastikan foto-foto yang ingin di-download sudah ada di cart (keranjang).",
  },
  {
    title: "Klik bookmark yang tadi disimpan",
    body:
      "Klik bookmark 'Ambil cart fotoyu' yang tadi kamu simpan. Halaman akan otomatis kembali ke web app ini dengan data cart terisi. Foto-foto siap di-download!",
  },
];

const JSON_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Pilih foto di aplikasi fotoyu",
    body:
      "Buka aplikasi fotoyu (mis. dari ancodebuddy/io). Pilih foto-foto yang ingin di-download, lalu tambahkan ke keranjang (cart).",
  },
  {
    title: "Buka web fotoyu di laptop (mode HP)",
    body:
      "Buka browser di laptop, tekan F12 → toggle device toolbar (Ctrl+Shift+M) untuk mode tampilan HP. Kunjungi fotoyu.com dan login dengan akun yang sama.",
  },
  {
    title: "Buka cart dan tangkap response API",
    body:
      "Buka keranjang. Di DevTools → tab Network → filter Fetch/XHR. Cari request ke: https://api.fotoyu.com/gs/v1/carts/preview",
  },
  {
    title: "Salin response",
    body:
      "Klik request-nya → tab Response → Copy response (atau salin manual teks JSON-nya). Lalu paste ke kotak di atas dan klik Proses.",
  },
];

const TOKEN_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Login ke fotoyu.com",
    body:
      "Buka fotoyu.com di tab baru. Login dengan akunmu. Pastikan foto-foto sudah ditambahkan ke cart lewat aplikasi sebelumnya.",
  },
  {
    title: "Buka DevTools",
    body:
      "Tekan F12 di keyboard. Buka tab Application (atau Storage di beberapa browser).",
  },
  {
    title: "Copy value key persist:root",
    body:
      "Di sidebar kiri: Storage → Local Storage → https://fotoyu.com. Cari key persist:root. Klik kanan value-nya → Copy (ini akan menyalin seluruh data, termasuk access_token yang tersembunyi di dalamnya).",
  },
  {
    title: "Paste di web app ini",
    body:
      "Paste seluruh value persist:root ke kotak di atas, lalu klik Ambil cart. Backend akan otomatis mengekstrak access_token dari data ini. Data akan disimpan otomatis di browser agar tidak perlu di-paste ulang sampai expired.",
  },
];

const ENHANCE_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Download foto dulu",
    body:
      "Pakai tab 'Login dengan token' atau 'Paste JSON' untuk mengunduh foto dari cart fotoyu. Tab prompt AI ini untuk mempercantik foto yang sudah kamu download.",
  },
  {
    title: "Pilih varian prompt",
    body:
      "Pilih salah satu varian di atas: Indonesia Lengkap, English Full (paling kompatibel untuk AI luar), atau Indonesia Singkat untuk penggunaan cepat.",
  },
  {
    title: "Copy prompt atau download .txt",
    body:
      "Klik 'Copy prompt' untuk menyalin ke clipboard, atau 'Download .txt' untuk menyimpan sebagai file. Lalu buka ChatGPT, Gemini, atau AI image editor favoritmu.",
  },
  {
    title: "Upload foto + paste prompt",
    body:
      "Di AI editor: upload foto hasil download, paste prompt tadi, lalu jalankan. Tunggu proses selesai dan download hasilnya. Gunakan AI berbayar (ChatGPT Plus, Gemini Advanced, Photoshop) untuk hasil terbaik.",
  },
];

interface HelpSectionProps {
  mode?: "bookmarklet" | "token" | "paste" | "enhance";
}

export default function HelpSection({ mode = "bookmarklet" }: HelpSectionProps) {
  const [open, setOpen] = useState(false);

  const steps = 
    mode === "bookmarklet" ? BOOKMARKLET_STEPS :
    mode === "token" ? TOKEN_STEPS : 
    mode === "paste" ? JSON_STEPS : 
    ENHANCE_STEPS;
    
  const label =
    mode === "bookmarklet"
      ? "📚 Panduan: Cara pakai bookmark 1-klik"
      : mode === "token"
      ? "📚 Panduan: Cara mendapatkan data login"
      : mode === "paste"
      ? "📚 Panduan: Cara mendapatkan JSON (untuk pengguna teknis)"
      : "📚 Panduan: Cara pakai prompt AI";

  return (
    <section className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2 animate-fade-in">
          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                  {i + 1}
                </span>
                <h4 className="text-sm font-semibold text-slate-800">
                  {s.title}
                </h4>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
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
