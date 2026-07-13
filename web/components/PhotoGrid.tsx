"use client";

import type { Photo } from "@/lib/parse";
import PhotoCard from "./PhotoCard";

interface PhotoGridProps {
  photos: Photo[];
  onDownloadAll: () => void;
  zipping: boolean;
}

export default function PhotoGrid({
  photos,
  onDownloadAll,
  zipping,
}: PhotoGridProps) {
  const totalSize = photos.reduce((sum, p) => sum + (p.size || 0), 0);
  const totalSizeText =
    totalSize > 0 ? formatBytes(totalSize) : "ukuran tidak diketahui";

  return (
    <div className="w-full animate-fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {photos.length} foto ditemukan
          </h2>
          <p className="text-sm text-slate-500">
            Total perkiraan: {totalSizeText}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadAll}
          disabled={zipping}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {zipping ? (
            <>
              <Spinner />
              Mengunduh...
            </>
          ) : (
            <>
              <ZipIcon />
              Download semua
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((photo, i) => (
          <PhotoCard key={photo.id + i} photo={photo} index={i} />
        ))}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
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

function ZipIcon() {
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
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  );
}
