"use client";

import { useState } from "react";

const STEPS: Array<{ title: string; body: string }> = [
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

export default function HelpSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2">
          <InfoIcon />
          Bagaimana cara mendapatkan response dari fotoyu?
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
          {STEPS.map((s, i) => (
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
