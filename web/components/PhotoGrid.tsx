"use client";

import { useState } from "react";
import type { Photo } from "@/lib/parse";
import PhotoCard from "./PhotoCard";
import Lightbox from "./Lightbox";
import SkeletonGrid from "./SkeletonGrid";
import EmptyState from "./EmptyState";
import WatermarkRemovalSettingsPanel from "./WatermarkRemovalSettings";
import { DEFAULT_WATERMARK_SETTINGS, type WatermarkRemovalSettings } from "@/lib/watermark-removal";

interface PhotoGridProps {
  photos: Photo[];
  allPhotos: Photo[];
  onDownloadAll: () => void;
  zipping: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
}

export default function PhotoGrid({
  photos,
  allPhotos,
  onDownloadAll,
  zipping,
  searchQuery,
  onSearchChange,
  selectedIds,
  onSelectedChange,
}: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkRemovalSettings>(DEFAULT_WATERMARK_SETTINGS);

  const totalSize = photos.reduce((sum, p) => sum + (p.size || 0), 0);
  const totalSizeText =
    totalSize > 0 ? formatBytes(totalSize) : "ukuran tidak diketahui";

  const toggleSelect = (productId: string) => {
    const next = new Set(selectedIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    onSelectedChange(next);
  };

  const selectAll = () => {
    if (selectedIds.size === photos.length) {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(new Set(photos.map((p) => p.product_id)));
    }
  };

  const downloadLabel = selectedIds.size > 0
    ? `Download ${selectedIds.size} terpilih`
    : "Download semua";

  if (zipping && allPhotos.length === 0 && photos.length === 0) {
    return <SkeletonGrid />;
  }

  const displayPhotoCount = selectedIds.size > 0 ? selectedIds.size : photos.length;

  return (
    <div className="w-full animate-fade-in space-y-5">
      {/* Watermark removal settings */}
      <WatermarkRemovalSettingsPanel
        settings={watermarkSettings}
        photoCount={displayPhotoCount}
        onChange={setWatermarkSettings}
      />

      {/* Stats + controls bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Row 1: stats + download button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {allPhotos.length} foto ditemukan
              {searchQuery && (
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  (menampilkan {photos.length})
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
                <DownloadAllIcon />
                {downloadLabel}
              </>
            )}
          </button>
        </div>

        {/* Row 2: search + select all */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon />
            <input
              type="text"
              placeholder="Cari foto (nama, judul, fotografer)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={selectAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            {selectedIds.size === photos.length && photos.length > 0 ? (
              <>Batal pilih semua</>
            ) : (
              <>Pilih semua</>
            )}
          </button>
        </div>
      </div>

      {/* Masonry grid */}
      {photos.length > 0 ? (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5 space-y-4">
          {photos.map((photo, i) => (
            <div key={photo.product_id + i} className="break-inside-avoid">
              <PhotoCard
                photo={photo}
                index={i}
                isSelected={selectedIds.has(photo.product_id)}
                onToggleSelect={() => toggleSelect(photo.product_id)}
                onImageClick={() => {
                  const idx = photos.findIndex((p) => p.product_id === photo.product_id);
                  setLightboxIndex(idx >= 0 ? idx : null);
                }}
                watermarkSettings={watermarkSettings}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          searchQuery={searchQuery}
          onReset={searchQuery ? () => onSearchChange("") : undefined}
        />
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}
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
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function DownloadAllIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
