"use client";

import { useState } from "react";

interface PasteFormProps {
  onProcess: (raw: string) => void;
  loading: boolean;
}

export default function PasteForm({ onProcess, loading }: PasteFormProps) {
  const [value, setValue] = useState("");
  const [dragOver, setDragOver] = useState(false);

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
    reader.onload = () => {
      const text = String(reader.result || "");
      setValue(text);
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setValue(text);
    } catch {
      // clipboard read may be blocked; ignore silently
    }
  };

  const charCount = value.length;

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full animate-fade-in space-y-4"
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          "relative rounded-2xl border-2 border-dashed transition-colors",
          dragOver
            ? "border-indigo-400 bg-indigo-50/60"
            : "border-slate-300 bg-white hover:border-slate-400",
        ].join(" ")}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            "Tempelkan (paste) response JSON dari fotoyu di sini...\n\n" +
            "Tip: klik kanan file response-fotoyu.txt → Open, copy semua, lalu paste ke sini.\n" +
            "Atau drag & drop file .txt/.json langsung ke kotak ini."
          }
          spellCheck={false}
          className="block h-72 w-full resize-y rounded-2xl bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <div className="pointer-events-none absolute bottom-3 right-4 select-none text-xs text-slate-400">
          {charCount.toLocaleString("id-ID")} karakter
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              Memproses...
            </>
          ) : (
            <>
              <SparklesIcon />
              Proses
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handlePaste}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ClipboardIcon />
          Paste dari clipboard
        </button>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          <FileIcon />
          Pilih file
          <input
            type="file"
            accept=".txt,.json,application/json,text/plain"
            onChange={handleFilePick}
            className="hidden"
          />
        </label>

        {value.trim() && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="ml-auto text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Bersihkan
          </button>
        )}
      </div>
    </form>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparklesIcon() {
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
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M5 17l.7 1.9L7.6 19.6 5.7 20.3 5 22.2 4.3 20.3 2.4 19.6 4.3 18.9 5 17z" />
    </svg>
  );
}

function ClipboardIcon() {
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
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function FileIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
