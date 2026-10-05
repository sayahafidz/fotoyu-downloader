"use client";

import { useState } from "react";

type VariantId = "id-full" | "en-full" | "id-short";

interface PromptVariant {
  id: VariantId;
  label: string;
  badge: string;
  description: string;
  text: string;
}

const PROMPTS: PromptVariant[] = [
  {
    id: "id-full",
    label: "Indonesia — Lengkap",
    badge: "ID",
    description:
      "Prompt detail berbahasa Indonesia untuk AI image editor (mis. Photoshop Generative Fill, Gemini).",
    text:
      "Hapus semua teks, watermark, caption, dan setiap artefak warna samar seperti garis pelangi (rainbow streak), kebocoran cahaya (light leaks), flare lensa, atau color banding dari foto ini, lalu isi area yang dibersihkan dengan tekstur alami yang menyatu sempurna dengan sekelilingnya tanpa meninggalkan bekas atau artefak. Tingkatkan kualitas foto secara profesional dengan menambah ketajaman dan detail, mengoreksi keseimbangan warna agar tampak natural, menyesuaikan pencahayaan secara halus, serta mengurangi noise atau grain jika ada. Lakukan retouch natural pada cacat kecil di kulit dengan batasan ketat: jangan ubah struktur wajah termasuk hidung, mata, bibir, atau rahang; jangan ubah proporsi tubuh seperti postur, ukuran, atau bentuk badan; jangan modifikasi fitur identitas agar orang tetap dapat dikenali; dan pertahankan ekspresi wajah asli. Pertahankan komposisi dan elemen latar belakang asli, hanya tingkatkan kejernihan secara halus tanpa menambah atau menghapus apa pun kecuali artefak yang tidak diinginkan di atas (teks, watermark, caption, garis pelangi/light leaks). Hasil akhir harus fotorealistik, terlihat seperti foto profesional dan bukan hasil editan, dengan komposisi dan framing asli yang tetap utuh tanpa jejak garis pelangi atau artefak lainnya.",
  },
  {
    id: "en-full",
    label: "English — Full",
    badge: "EN",
    description:
      "Versi Inggris untuk AI generator / chatbot (ChatGPT, Gemini, Midjourney editor). Paling kompatibel.",
    text:
      "Remove all text, watermarks, captions, and any faint color artifacts such as rainbow-colored streaks, light leaks, lens flare lines, or color banding from this photo, then fill the cleared areas with natural textures that blend seamlessly with the surroundings, leaving no trace or artifacts. Professionally enhance the photo quality by improving sharpness and detail, correcting color balance for a natural look, adjusting lighting subtly, and reducing noise or grain where present.\n\nPerform natural retouching on minor skin blemishes, with strict constraints: do not alter facial structure including the nose, eyes, lips, or jaw; do not change body proportions such as posture, size, or shape; do not modify identifying features so the person remains recognizable; and preserve the original facial expression.\n\nMaintain the original background composition and elements, only subtly improving clarity without adding or removing anything except the unwanted artifacts mentioned above (text, watermarks, captions, rainbow streaks/light leaks). The final result must be photorealistic, appearing like a professional photograph rather than an edited image, with the original composition and framing fully intact — with no visible trace of the removed rainbow line or any other artifact.",
  },
  {
    id: "id-short",
    label: "Indonesia — Singkat",
    badge: "ID",
    description: "Versi ringkas untuk penggunaan cepat tanpa banyak detail teknis.",
    text:
      "Hapus semua teks, watermark, dan artefak garis pelangi/light leaks pada foto ini dan isi area bekasnya secara natural tanpa meninggalkan jejak. Tingkatkan kualitas foto menjadi lebih tajam, warna lebih seimbang, dan pencahayaan lebih baik dengan gaya fotorealistik profesional. Perbaiki cacat kulit kecil secara natural, tetapi jangan ubah struktur wajah, proporsi tubuh, maupun identitas orangnya. Pertahankan background asli dan hasil akhir tidak boleh terlihat seperti hasil edit.",
  },
];

interface EnhanceFormProps {
  loading?: boolean;
}

export default function EnhanceForm({ loading = false }: EnhanceFormProps) {
  const [selectedId, setSelectedId] = useState<VariantId>("en-full");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const selected =
    PROMPTS.find((p) => p.id === selectedId) ?? PROMPTS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selected.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = selected.text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
      document.body.removeChild(ta);
    }
  };

  const handleOpenChatGPT = () => {
    window.open("https://chat.openai.com/", "_blank", "noopener,noreferrer");
  };

  const handleOpenGemini = () => {
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
  };

  const handleDownloadTxt = () => {
    setDownloading(true);
    try {
      const blob = new Blob([selected.text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug =
        selected.id === "en-full"
          ? "prompt-enhance-en"
          : selected.id === "id-short"
          ? "prompt-enhance-id-short"
          : "prompt-enhance-id";
      a.download = `${slug}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-start gap-3.5">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/20">
            <SparkleIcon />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Prompt AI untuk Mempercantik & Hapus Watermark Foto
            </h2>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Pilih varian prompt di bawah, lalu copy ke ChatGPT Plus, Google Gemini, atau Photoshop untuk meningkatkan resolusi foto.
            </p>
          </div>
        </div>

        {/* Variant selector */}
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => {
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                disabled={loading}
                onClick={() => setSelectedId(p.id)}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs sm:text-sm font-semibold transition-all active:scale-95",
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
                  ].join(" ")}
                >
                  {p.badge}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {selected.description}
        </p>
      </div>

      {/* Prompt preview */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Prompt Teks
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {selected.text.length} karakter
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={[
              "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95",
              copied
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
            ].join(" ")}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Tersalin!" : "Salin Prompt"}
          </button>
        </div>

        <textarea
          readOnly
          value={selected.text}
          className="block h-48 sm:h-40 w-full resize-y border-0 bg-transparent px-5 py-4 font-mono text-xs sm:text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200"
          spellCheck={false}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handleOpenChatGPT}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95"
        >
          <ChatIcon />
          Buka ChatGPT
        </button>
        <button
          type="button"
          onClick={handleOpenGemini}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:opacity-90 active:scale-95"
        >
          <SparkleIcon />
          Buka Gemini
        </button>
        <button
          type="button"
          onClick={handleDownloadTxt}
          disabled={downloading}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors active:scale-95"
        >
          <DownloadIcon />
          {downloading ? "Mengunduh..." : "Download .txt"}
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
          <strong>💡 Tips:</strong> Untuk hasil terbaik, gunakan model multimodal AI (ChatGPT Plus / Gemini Advanced / Photoshop Generative Fill). Upload foto beresolusi tinggi hasil download dari aplikasi ini, paste prompt di atas, dan download hasilnya.
        </p>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4L12 2z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" opacity="0.7" />
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

function ChatIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.3 1.2 4.4 3.2 5.9-.2 1.1-.8 2.5-1.8 3.6-.2.2-.2.5 0 .7.1.1.2.2.4.2 2.3 0 4.3-.9 5.6-1.8 1 .3 2 .4 3 .4 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
    </svg>
  );
}

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
