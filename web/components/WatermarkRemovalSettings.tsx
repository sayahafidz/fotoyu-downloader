"use client";

import { useCallback, useEffect, useState } from "react";
import type { WatermarkRemovalSettings } from "@/lib/watermark-removal";

interface Props {
  settings: WatermarkRemovalSettings;
  photoCount: number;
  onChange: (settings: WatermarkRemovalSettings) => void;
}

export default function WatermarkRemovalSettingsPanel({ settings, photoCount, onChange }: Props) {
  const [quota, setQuota] = useState<{ remaining: number; limit: number; resetsAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadQuota = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/watermark-quota", { cache: "no-store" });
      if (!response.ok) throw new Error("Kuota belum dapat dimuat. Coba lagi.");
      setQuota(await response.json());
      setError(null);
    } catch (error) { setError(error instanceof Error ? error.message : "Kuota gagal dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    loadQuota();
    window.addEventListener("watermark-quota-changed", loadQuota);
    return () => window.removeEventListener("watermark-quota-changed", loadQuota);
  }, [loadQuota]);
  return (
    <div className="space-y-4">
      <label className="setting-row">
        <input type="checkbox" checked={settings.enabled} disabled={loading || Boolean(error) || quota?.remaining === 0} onChange={(event) => onChange({ ...settings, enabled: event.target.checked })} />
        <span>Hapus watermark otomatis<span className="setting-help">Maksimal 5 foto berhasil diproses per hari. Reset pukul 00.00 WIB.</span></span>
      </label>
      <p role="status" className="text-sm text-slate-600 dark:text-slate-400">{loading ? "Memuat kuota…" : quota ? `Sisa kuota hari ini: ${quota.remaining} dari ${quota.limit} foto.` : ""}</p>
      {error && <div><p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p><button type="button" className="btn-quiet" onClick={loadQuota}>Muat ulang kuota</button></div>}
      {settings.enabled && <div className="space-y-3">
        <label htmlFor="watermark-provider" className="block text-sm font-medium">Provider pemrosesan</label>
        <select id="watermark-provider" className="field" value={settings.provider || "gemini"} onChange={(event) => onChange({ ...settings, provider: event.target.value as "gemini" | "openai" | "dewatermark" })}>
          <option value="gemini">Gemini (default)</option>
          <option value="openai">OpenAI / ChatGPT</option>
          <option value="dewatermark">Dewatermark</option>
        </select>
        <p className="text-sm text-slate-600 dark:text-slate-400">Model, API key, dan custom base URL dikelola oleh pemilik server. Jika pemrosesan gagal, foto asli tetap diunduh.</p>
        {quota && photoCount > quota.remaining && <p className="text-sm text-amber-800 dark:text-amber-200">Kamu memilih {photoCount} foto, tetapi kuota tersisa {quota.remaining}. Foto di luar kuota diunduh tanpa penghapusan watermark.</p>}
        {quota?.remaining === 0 && <button type="button" className="btn-secondary" onClick={() => onChange({ ...settings, enabled: false })}>Unduh foto asli saja</button>}
      </div>}
    </div>
  );
}
