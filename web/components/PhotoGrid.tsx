"use client";

import { useMemo, useState } from "react";
import type { Photo } from "@/lib/parse";
import PhotoCard from "./PhotoCard";
import Lightbox from "./Lightbox";
import CollageModal from "./CollageModal";
import SkeletonGrid from "./SkeletonGrid";
import EmptyState from "./EmptyState";
import WatermarkRemovalSettingsPanel from "./WatermarkRemovalSettings";
import { DEFAULT_WATERMARK_SETTINGS, type WatermarkRemovalSettings } from "@/lib/watermark-removal";

export type DownloadMode = "direct" | "zip";
export type ViewLayout = "grid" | "list";

export interface DownloadExecutionOptions {
  watermarkSettings: WatermarkRemovalSettings;
  downloadMode: DownloadMode;
  autoEnhance: boolean;
  folderByCreator: boolean;
}

interface PhotoGridProps {
  photos: Photo[];
  allPhotos: Photo[];
  onDownloadAll: (options: DownloadExecutionOptions) => void;
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
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("direct");
  const [viewLayout, setViewLayout] = useState<ViewLayout>("grid");
  const [selectedCreator, setSelectedCreator] = useState<string>("ALL");
  const [autoEnhance, setAutoEnhance] = useState<boolean>(false);
  const [folderByCreator, setFolderByCreator] = useState<boolean>(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [isCollageOpen, setIsCollageOpen] = useState<boolean>(false);

  // Extract unique creators and their counts
  const creatorStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPhotos) {
      const name = p.creator_name?.trim() || "Lainnya";
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [allPhotos]);

  // Filter photos by creator chip if selected
  const displayedPhotos = useMemo(() => {
    if (selectedCreator === "ALL") return photos;
    return photos.filter((p) => (p.creator_name?.trim() || "Lainnya") === selectedCreator);
  }, [photos, selectedCreator]);

  const totalSize = displayedPhotos.reduce((sum, p) => sum + (p.size || 0), 0);
  const totalSizeText = totalSize > 0 ? formatBytes(totalSize) : "";

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
    if (selectedIds.size === displayedPhotos.length && displayedPhotos.length > 0) {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(new Set(displayedPhotos.map((p) => p.product_id)));
    }
  };

  const isAllSelected = selectedIds.size === displayedPhotos.length && displayedPhotos.length > 0;
  const countToDownload = selectedIds.size > 0 ? selectedIds.size : displayedPhotos.length;
  const downloadBtnLabel = selectedIds.size > 0
    ? `Download ${selectedIds.size} Terpilih`
    : `Download Semua (${displayedPhotos.length})`;

  const handleTriggerDownload = () => {
    onDownloadAll({
      watermarkSettings,
      downloadMode,
      autoEnhance,
      folderByCreator,
    });
  };

  if (zipping && allPhotos.length === 0 && photos.length === 0) {
    return <SkeletonGrid />;
  }

  return (
    <div className="w-full animate-fade-in space-y-3.5 pb-28 sm:pb-12">
      {/* Compact Main Control Header */}
      <div className="flex flex-col gap-2.5 rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        {/* Row 1: Summary + View Layout + Quick Adjust Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{allPhotos.length} Foto Siap</span>
              {totalSizeText && (
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  · {totalSizeText}
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle: Grid vs List */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewLayout("grid")}
                className={[
                  "p-1.5 rounded-lg text-xs font-bold transition-all active:scale-95",
                  viewLayout === "grid"
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
                ].join(" ")}
                title="Tampilan Grid Foto"
              >
                <GridIcon />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("list")}
                className={[
                  "p-1.5 rounded-lg text-xs font-bold transition-all active:scale-95",
                  viewLayout === "list"
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
                ].join(" ")}
                title="Tampilan List Ringkas"
              >
                <ListIcon />
              </button>
            </div>

            {/* 🎨 Story / Finisher Collage Studio Button */}
            <button
              type="button"
              onClick={() => setIsCollageOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 active:scale-95 shadow-sm"
              title="Buat Instagram / WhatsApp Story & Finisher Collage"
            >
              <span>🎨</span>
              <span className="text-[11px] sm:text-xs">Story</span>
            </button>

            {/* Offline Auto-Enhance Quick Toggle */}
            <button
              type="button"
              onClick={() => setAutoEnhance(!autoEnhance)}
              className={[
                "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all border active:scale-95",
                autoEnhance
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              ].join(" ")}
              title="Tingkatkan kecerahan, kontras warna, dan bersihkan artefak pelangi otomatis di browser"
            >
              <span>{autoEnhance ? "✨" : "🪄"}</span>
              <span className="text-[11px] sm:text-xs">
                {autoEnhance ? "Enhance ON" : "Auto Tone"}
              </span>
            </button>

            {/* AI Watermark Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={[
                "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all border active:scale-95",
                watermarkSettings.enabled || showSettingsDrawer
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              ].join(" ")}
              title="Buka Pengaturan AI Watermark & Folder"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline text-xs">Opsi</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Input & Select All */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon />
            <input
              type="text"
              placeholder="Cari nama file / fotografer..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <button
            type="button"
            onClick={selectAll}
            className="inline-flex items-center gap-1 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 active:scale-95 transition-colors"
          >
            {isAllSelected ? "Batal Semua" : "Pilih Semua"}
          </button>
        </div>

        {/* Row 3: Photographer / Creator Smart Filter Chips */}
        {creatorStats.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setSelectedCreator("ALL")}
              className={[
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-all active:scale-95",
                selectedCreator === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              ].join(" ")}
            >
              Semua ({allPhotos.length})
            </button>

            {creatorStats.map(({ name, count }) => {
              const active = selectedCreator === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedCreator(active ? "ALL" : name)}
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-all active:scale-95 flex items-center gap-1",
                    active
                      ? "bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                  ].join(" ")}
                >
                  <span>📸</span>
                  <span>{name}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Settings Drawer (Folder by creator & AI Watermark) */}
      {showSettingsDrawer && (
        <div className="space-y-3 rounded-3xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={folderByCreator}
                onChange={(e) => setFolderByCreator(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700"
              />
              <span>🗂️ Rapikan ZIP per folder nama fotografer</span>
            </label>

            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Contoh: <code className="font-mono text-indigo-600 dark:text-indigo-300">/Fotografer_A/IMG_01.jpg</code>
            </span>
          </div>

          <WatermarkRemovalSettingsPanel
            settings={watermarkSettings}
            photoCount={countToDownload}
            onChange={setWatermarkSettings}
          />
        </div>
      )}

      {/* Grid or List Layout (Clean Google Photos Style) */}
      {displayedPhotos.length > 0 ? (
        viewLayout === "grid" ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-5">
            {displayedPhotos.map((photo, i) => (
              <PhotoCard
                key={photo.product_id + i}
                photo={photo}
                index={i}
                isSelected={selectedIds.has(photo.product_id)}
                onToggleSelect={() => toggleSelect(photo.product_id)}
                onImageClick={() => {
                  const idx = displayedPhotos.findIndex((p) => p.product_id === photo.product_id);
                  setLightboxIndex(idx >= 0 ? idx : null);
                }}
                viewMode="grid"
                watermarkSettings={watermarkSettings}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayedPhotos.map((photo, i) => (
              <PhotoCard
                key={photo.product_id + i}
                photo={photo}
                index={i}
                isSelected={selectedIds.has(photo.product_id)}
                onToggleSelect={() => toggleSelect(photo.product_id)}
                onImageClick={() => {
                  const idx = displayedPhotos.findIndex((p) => p.product_id === photo.product_id);
                  setLightboxIndex(idx >= 0 ? idx : null);
                }}
                viewMode="list"
                watermarkSettings={watermarkSettings}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          searchQuery={searchQuery}
          onReset={searchQuery ? () => onSearchChange("") : undefined}
        />
      )}

      {/* Fullscreen Lightbox with Before/After Enhance Slider */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={displayedPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}

      {/* Fixed Sticky Thumb-Friendly Bottom Floating Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 shadow-2xl safe-area-bottom">
        <div className="mx-auto max-w-xl flex items-center justify-between gap-2">
          {/* Mode Switcher: Galeri HP vs ZIP */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setDownloadMode("direct")}
              className={[
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95",
                downloadMode === "direct"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
              ].join(" ")}
            >
              📱 Galeri
            </button>
            <button
              type="button"
              onClick={() => setDownloadMode("zip")}
              className={[
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95",
                downloadMode === "zip"
                  ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
              ].join(" ")}
            >
              📦 ZIP
            </button>
          </div>

          {/* Story / Collage Creator trigger */}
          <button
            type="button"
            onClick={() => setIsCollageOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 active:scale-95 transition-all shadow-sm"
            title="Buka Story & Collage Creator"
          >
            <span className="text-base">🎨</span>
          </button>

          {/* Big Primary Action Button */}
          <button
            type="button"
            onClick={handleTriggerDownload}
            disabled={zipping}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 px-3.5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 transition-all"
          >
            {zipping ? (
              <>
                <Spinner />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <DownloadIcon />
                <span>{downloadBtnLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Story & Finisher Collage Studio Modal */}
      <CollageModal
        isOpen={isCollageOpen}
        onClose={() => setIsCollageOpen(false)}
        selectedPhotos={allPhotos.filter((p) => selectedIds.has(p.product_id))}
        allPhotos={allPhotos}
      />
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

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}
