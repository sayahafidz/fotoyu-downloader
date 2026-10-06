"use client";

import { useState } from "react";

interface PasteFormProps {
  onProcess: (raw: string) => void;
  loading: boolean;
}

export default function PasteForm({ onProcess, loading }: PasteFormProps) {
  const [value, setValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onProcess(value);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    setInputError(null);
    reader.onerror = () => setInputError("File tidak dapat dibaca. Pilih ulang atau tempel JSON.");
    reader.onload = () => {
      const text = String(reader.result || "");
      setValue(text);
    };
    reader.readAsText(file);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    setInputError(null);
    reader.onerror = () => setInputError("File tidak dapat dibaca. Pilih ulang atau tempel JSON.");
    reader.onload = () => {
      const text = String(reader.result || "");
      setValue(text);
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    setInputError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text) setValue(text);
    } catch {
      setInputError("Akses clipboard tidak tersedia. Tekan lama kotak teks, lalu pilih Tempel.");
    }
  };

  const charCount = value.length;

  return (
    <form onSubmit={handleSubmit} className="import-panel themed-tool space-y-4" aria-busy={loading}>
      <h2 className="text-xl font-semibold">Muat file atau JSON</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">Pilih file ekspor .json / .txt atau tempel response keranjang Fotoyu.</p>
      <label htmlFor="json-input" className="block text-sm font-medium">Data keranjang</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          "relative rounded-3xl border-2 border-dashed transition-all",
          dragOver
            ? "border-indigo-500 bg-indigo-50/70 dark:border-indigo-400 dark:bg-indigo-950/40"
            : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
        ].join(" ")}
      >
        <textarea
          id="json-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tempel response JSON di sini"
          disabled={loading}
          spellCheck={false}
          className="field h-48 pb-10 font-mono"
        />
        <div className="pointer-events-none absolute bottom-3 right-4 select-none text-xs font-mono text-slate-400 dark:text-slate-500">
          {charCount.toLocaleString("id-ID")} karakter
        </div>
      </div>
      {inputError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{inputError}</p>}

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              Memproses data...
            </>
          ) : (
            <>
              Muat foto
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handlePaste}
          className="btn-secondary flex-1"
        >
          <ClipboardIcon />
          Tempel clipboard
        </button>

        <label className="relative btn-secondary flex-1 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-indigo-500">
          <FileIcon />
          Pilih File
          <input
            type="file"
            accept=".txt,.json,application/json,text/plain"
            onChange={handleFilePick}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        {value.trim() && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="w-full sm:w-auto sm:ml-auto text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-center py-2 transition-colors"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Tutorial Section */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-xs">
            ℹ
          </span>
          <div className="flex-1 space-y-2 text-xs sm:text-sm">
            <p className="font-bold text-blue-950 dark:text-blue-200">
               Mengambil JSON lewat laptop?
            </p>
            <p className="text-blue-900/90 dark:text-blue-300 leading-relaxed text-xs">
              Response JSON dari fotoyu.com menyertakan field <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px] text-blue-900 dark:bg-blue-900/60 dark:text-blue-200">url</code> untuk link foto resolusi tinggi ketika diakses dalam mode mobile.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M5 17l.7 1.9L7.6 19.6 5.7 20.3 5 22.2 4.3 20.3 2.4 19.6 4.3 18.9 5 17z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
