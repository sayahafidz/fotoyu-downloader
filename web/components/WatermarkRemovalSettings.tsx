"use client";

import { useState } from "react";
import type { WatermarkRemovalSettings, WatermarkRegion } from "@/lib/watermark-removal";
import { estimateCost, formatCost, getRegionDisplayName } from "@/lib/watermark-removal";

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

  const cost = estimateCost(photoCount);

  const toggleEnabled = () => {
    onChange({ ...settings, enabled: !settings.enabled });
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

  return (
    <div className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleEnabled}
            className={[
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              settings.enabled
                ? "bg-indigo-600"
                : "bg-slate-300 dark:bg-slate-600",
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
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Hapus Watermark dengan AI
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menggunakan Dewatermark.ai (server-side processing)
            </p>
          </div>
        </div>
        
        {settings.enabled && (
          <div className="text-right">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Estimasi biaya
            </p>
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
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (AI deteksi otomatis)
              </span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
              AI akan otomatis mendeteksi dan menghapus teks watermark. Paling akurat untuk text watermark.
            </p>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih area dimana watermark biasanya berada. AI akan fokus menghapus pada area tersebut.
              </p>
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
              {/* Remove text option */}
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.removeText}
                  onChange={toggleRemoveText}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600"
                />
                <span>Remove text watermarks</span>
              </label>

              {/* Info panel */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
                <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ℹ️ Informasi
                </h4>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>• Processing time: 2-5 detik per foto</li>
                  <li>• Quality: 9/10 (AI-powered inpainting)</li>
                  <li>• Tidak membebani laptop client (server-side)</li>
                  <li>• Credits tidak expired (one-time purchase)</li>
                  <li>
                    • <a
                      href="https://platform.dewatermark.ai/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Dashboard Dewatermark.ai →
                    </a>
                  </li>
                </ul>
              </div>

              {/* Pricing tiers */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
                <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  💰 Pricing Tiers
                </h4>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>100 foto:</span>
                    <span className="font-medium">$7 ($0.07/foto)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1,000 foto:</span>
                    <span className="font-medium">$25 ($0.025/foto)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>10,000 foto:</span>
                    <span className="font-medium">$100 ($0.01/foto)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning if not configured */}
      {settings.enabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            ⚠️ <strong>Catatan:</strong> Fitur ini memerlukan Dewatermark.ai API key.
            Pastikan <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/50">DEWATERMARK_API_KEY</code> sudah dikonfigurasi di environment variables.
          </p>
        </div>
      )}
    </div>
  );
}
