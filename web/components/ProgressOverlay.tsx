"use client";

import { useState } from "react";
import type { DownloadAllProgress } from "@/lib/download";
import { useDialog } from "@/lib/use-dialog";

interface ProgressOverlayProps {
  progress: DownloadAllProgress | null;
  error: string | null;
  onClose?: () => void;
  onCancel?: () => void;
}

const stages = {
  fetching: { title: "Memuat foto", detail: "Mengambil foto dari sumber sebelum diproses." },
  watermark: { title: "Menghapus watermark", detail: "Foto sedang diproses. Waktu proses mengikuti ukuran foto dan provider." },
  enhancing: { title: "Mengoreksi warna", detail: "Menyesuaikan pencahayaan dan kontras foto." },
  saving: { title: "Menyiapkan unduhan", detail: "Mengirim file ke browser untuk disimpan di perangkat." },
  archiving: { title: "Membuat file ZIP", detail: "Pemrosesan foto selesai. Menggabungkan file untuk diunduh." },
};

export default function ProgressOverlay({ progress, error, onClose, onCancel }: ProgressOverlayProps) {
  const dialogRef = useDialog(Boolean(progress || error), error ? onClose : undefined);
  if (!progress && !error) return null;
  const stage = progress?.stage || "fetching";
  const processing = stage === "watermark" || stage === "enhancing";
  const copy = stages[stage];
  const pct = stage === "archiving" ? progress?.archivePercent || 0 : Math.min(100, Math.round((progress?.done || 0) / Math.max(1, progress?.total || 1) * 100));
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="processing-title" tabIndex={-1} className="dialog-backdrop">
      <div className="dialog-sheet max-w-md p-5 sm:p-6">
        {error ? <>
          <h2 id="processing-title" className="text-xl font-semibold">Unduhan belum selesai</h2>
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>
          {onClose && <button type="button" className="btn-secondary mt-5" onClick={onClose}>Tutup</button>}
        </> : <>
          {progress?.watermarkEnabled && <ol className="processing-steps" aria-label="Tahap proses">
            <li aria-current={stage !== "saving" && stage !== "archiving" ? "step" : undefined}><span>{stage === "saving" || stage === "archiving" ? "✓" : "1"}</span>Proses foto</li>
            <li aria-current={stage === "saving" || stage === "archiving" ? "step" : undefined}><span>2</span>Unduh file</li>
          </ol>}
          {processing && progress?.photo ? <ProcessingPhoto key={progress.photo.url} photo={progress.photo} /> : <div className="file-loading" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none"><path d="M14 5h14l9 9v28H14V5Z" stroke="currentColor" strokeWidth="2" /><path d="M28 5v10h9M25 22v12m-5-5 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div className="file-loading-track"><span /></div>
          </div>}
          <div className="mt-5" role="status" aria-live="polite">
            <h2 id="processing-title" className="text-xl font-semibold">{copy.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{copy.detail}</p>
          </div>
          {progress?.photo && processing && <p className="mt-3 truncate text-sm font-medium" title={progress.photo.filename}>{progress.photo.filename}</p>}
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span>{stage === "archiving" ? "Arsip ZIP" : `${progress?.done || 0} dari ${progress?.total || 0} foto selesai`}</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-400">{pct}%</span>
          </div>
          <div role="progressbar" aria-label={stage === "archiving" ? "Pembuatan ZIP" : "Foto selesai diproses"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="processing-progress"><span style={{ transform: `scaleX(${pct / 100})` }} /></div>
          {progress?.watermarkEnabled && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{progress.watermarkSuccess || 0} watermark berhasil dihapus{progress.watermarkFailed ? ` · ${progress.watermarkFailed} foto memakai versi asli` : ""}.</p>}
          {onCancel && <button type="button" className="btn-secondary mt-5 w-full" onClick={onCancel}>Batalkan proses</button>}
        </>}
      </div>
    </div>
  );
}

function ProcessingPhoto({ photo }: { photo: { url: string; filename: string } }) {
  const [failed, setFailed] = useState(false);
  return <div className="processing-photo" aria-label={`Sedang memproses ${photo.filename}`} aria-busy="true">
    {!failed ? <img src={`/api/proxy?url=${encodeURIComponent(photo.url)}`} alt={photo.filename} onError={() => setFailed(true)} /> : <span className="processing-photo-placeholder">Preview tidak tersedia</span>}
    <div className="photo-scan" aria-hidden="true"><span /></div>
    <span className="processing-photo-status"><span className="processing-dot" />Memproses foto</span>
  </div>;
}
