"use client";

import { useEffect, useState } from "react";
import type { WatermarkRemovalSettings, WatermarkRegion } from "@/lib/watermark-removal";
import { estimateCost, formatCost } from "@/lib/watermark-removal";

interface WatermarkRemovalSettingsProps {
  settings: WatermarkRemovalSettings;
  photoCount: number;
  onChange: (settings: WatermarkRemovalSettings) => void;
}

export default function WatermarkRemovalSettingsPanel({
  settings,
  photoCount,
  onChange,
}: WatermarkRemovalSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiBaseUrlInput, setGeminiBaseUrlInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("fotoyu_gemini_key") || "";
      const storedBaseUrl = localStorage.getItem("fotoyu_gemini_base_url") || "";
      setGeminiKeyInput(storedKey);
      setGeminiBaseUrlInput(storedBaseUrl);
    }
  }, []);

  const cost = estimateCost(photoCount);

  const toggleEnabled = () => {
    onChange({ ...settings, enabled: !settings.enabled });
  };

  const handleProviderChange = (provider: "gemini" | "openai" | "dewatermark") => {
    onChange({ ...settings, provider });
  };

  const handleSaveGeminiKey = (key: string) => {
    setGeminiKeyInput(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("fotoyu_gemini_key", key);
    }
    onChange({ ...settings, geminiKey: key });
  };

  const handleSaveGeminiBaseUrl = (url: string) => {
    setGeminiBaseUrlInput(url);
    if (typeof window !== "undefined") {
      localStorage.setItem("fotoyu_gemini_base_url", url);
    }
    onChange({ ...settings, geminiBaseUrl: url });
  };

  const setRegionPosition = (position: WatermarkRegion["position"]) => {
    onChange({
      ...settings,
      region: position ? { position } : undefined,
      autoDetect: !position,
    });
  };

  const toggleRemoveText = () => {
    onChange({ ...settings, removeText: !settings.removeText });
  };

  const regionPresets: Array<{ id: WatermarkRegion["position"]; label: string }> = [
    { id: "TL", label: "Kiri Atas" },
    { id: "T", label: "Atas" },
    { id: "TR", label: "Kanan Atas" },
    { id: "L", label: "Kiri" },
    { id: "C", label: "Tengah" },
    { id: "R", label: "Kanan" },
    { id: "BL", label: "Kiri Bawah" },
    { id: "B", label: "Bawah" },
    { id: "BR", label: "Kanan Bawah" },
  ];

  const currentProvider = settings.provider || "gemini";

  return (
    <div className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Header with toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleEnabled}
            className={[
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              settings.enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                settings.enabled ? "translate-x-6" : "translate-x-1",
              ].join(" ")}
            />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Hapus Watermark Langsung (AI)</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                GEMINI 2.0 FLASH FREE
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Otomatis hilangkan watermark saat download tanpa re-upload ke ChatGPT/Gemini
            </p>
          </div>
        </div>

        {settings.enabled && currentProvider === "dewatermark" && (
          <div className="text-right">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Estimasi biaya</p>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {formatCost(cost.costUSD, cost.costIDR)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {photoCount} foto × {cost.credits} credits
            </p>
          </div>
        )}
      </div>

      {/* Settings panel (shown when enabled) */}
      {settings.enabled && (
        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          {/* Provider Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih AI Provider:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange("gemini")}
                className={[
                  "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                  currentProvider === "gemini"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                <span className="font-bold text-xs">Google Gemini Flash</span>
                <span className="text-[10px] opacity-80">Gratis 1,500 req/hari (AI Studio)</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("dewatermark")}
                className={[
                  "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                  currentProvider === "dewatermark"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                <span className="font-bold text-xs">Dewatermark.ai</span>
                <span className="text-[10px] opacity-80">Memerlukan API Key Server</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("openai")}
                className={[
                  "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                  currentProvider === "openai"
                    ? "border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                <span className="font-bold text-xs">OpenAI GPT-4o</span>
                <span className="text-[10px] opacity-80">Vision model API</span>
              </button>
            </div>
          </div>

          {/* Gemini Key & Custom Base URL Inputs */}
          {currentProvider === "gemini" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    Google Gemini Secret Key / API Key:
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Dapatkan Key Gratis →
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="Paste AIzaSy... (tersimpan aman di localStorage browser)"
                  value={geminiKeyInput}
                  onChange={(e) => handleSaveGeminiKey(e.target.value)}
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                  Custom API Base URL (Opsional / Custom Proxy):
                </label>
                <input
                  type="text"
                  placeholder="Opsional: https://generativelanguage.googleapis.com atau proxy custom Anda"
                  value={geminiBaseUrlInput}
                  onChange={(e) => handleSaveGeminiBaseUrl(e.target.value)}
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400/80">
                  Kosongkan jika menggunakan endpoint resmi Google AI Studio. Isi jika Anda memakai Cloudflare AI Gateway atau reverse proxy custom.
                </p>
              </div>
            </div>
          )}

          {/* Auto-detect toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={settings.autoDetect}
                onChange={() => setRegionPosition(undefined)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600"
              />
              <span className="font-medium">Auto-detect watermark</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">(AI deteksi otomatis)</span>
            </label>
          </div>

          {/* Manual region selection */}
          {!settings.autoDetect && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Pilih posisi watermark
              </label>
              <div className="grid grid-cols-3 gap-2">
                {regionPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setRegionPosition(preset.id)}
                    className={[
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                      settings.region?.position === preset.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-indigo-500",
                    ].join(" ")}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced settings toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {showAdvanced ? "▼ Sembunyikan" : "▶ Pengaturan lanjutan"}
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.removeText}
                  onChange={toggleRemoveText}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600"
                />
                <span>Remove text watermarks</span>
              </label>

              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
                <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ℹ️ Informasi Fitur AI
                </h4>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>• Gemini 2.0 Flash: Sangat cepat & gratis via Google AI Studio Key</li>
                  <li>• Processing time: 2-4 detik per foto</li>
                  <li>• Langsung mengunduh foto bersih tanpa perlu manual ke ChatGPT/Gemini lagi</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
