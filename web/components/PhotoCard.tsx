"use client";

import { useState } from "react";
import type { Photo } from "@/lib/parse";
import { downloadPhotoDirect } from "@/lib/download";
import { removeWatermark, type WatermarkRemovalSettings } from "@/lib/watermark-removal";
import { downloadBlob } from "@/lib/download";

interface PhotoCardProps {
  photo: Photo;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onImageClick: () => void;
  watermarkSettings?: WatermarkRemovalSettings;
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function PhotoCard({ 
  photo, 
  index, 
  isSelected, 
  onToggleSelect, 
  onImageClick,
  watermarkSettings,
}: PhotoCardProps) {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;
  const [src, setSrc] = useState<string>(proxyUrl);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [removingWatermark, setRemovingWatermark] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    setErrorMessage(null);
    try {
      await downloadPhotoDirect(photo);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadWithWatermarkRemoval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    setRemovingWatermark(true);
    setErrorMessage(null);

    try {
      const settings = watermarkSettings || {
        enabled: true,
        removeText: true,
        autoDetect: true,
      };

      const result = await removeWatermark(photo, settings);

      if (result.success && result.processedImageBlob) {
        // Download the processed image
        downloadBlob(result.processedImageBlob, photo.filename);
        
        // Clean up object URL
        if (result.processedImageUrl) {
          const urlToRevoke = result.processedImageUrl;
          setTimeout(() => URL.revokeObjectURL(urlToRevoke), 5000);
        }
      } else {
        // Fallback to original if watermark removal failed
        setErrorMessage(result.error || "Gagal menghapus watermark");
        await downloadPhotoDirect(photo);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan");
      await downloadPhotoDirect(photo);
    } finally {
      setRemovingWatermark(false);
    }
  };

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:hover:shadow-slate-950/60 animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}
    >
      {/* Image area — click opens lightbox */}
      <button
        type="button"
        onClick={onImageClick}
        className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {!errored ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={photo.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (src === proxyUrl) {
                setSrc(photo.url);
              } else {
                setErrored(true);
                setLoaded(true);
              }
            }}
            className={[
              "h-full w-full object-cover transition-all duration-500",
              loaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
              "group-hover:scale-105",
            ].join(" ")}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
            <BrokenIcon />
            <p className="text-xs text-slate-500 dark:text-slate-400">Gagal memuat pratinjau</p>
          </div>
        )}

        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500 dark:border-slate-600 dark:border-t-indigo-400" />
          </div>
        )}

        {/* Index badge */}
        <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-mono font-medium text-white backdrop-blur-sm">
          #{index + 1}
        </div>

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 flex items-end justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-t from-black/50 via-transparent to-transparent">
          <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
            Klik untuk preview
          </span>
        </div>

        {/* Select checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={[
            "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all",
            isSelected
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-white/80 bg-black/30 text-transparent hover:border-white",
          ].join(" ")}
        >
          {isSelected && (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      </button>

      {/* Info section */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p
          className="truncate font-mono text-xs font-medium text-slate-700 dark:text-slate-200"
          title={photo.filename}
        >
          {photo.filename}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          {photo.resolution && (
            <span>
              {photo.resolution.width}x{photo.resolution.height}
            </span>
          )}
          {photo.size > 0 && <span>· {formatSize(photo.size)}</span>}
          {photo.creator_name && (
            <span className="truncate">· {photo.creator_name}</span>
          )}
        </div>

        {/* Download button with dropdown */}
        <div className="relative mt-auto">
          {errorMessage && (
            <div className="mb-2 rounded-md bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {errorMessage}
            </div>
          )}
          
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || removingWatermark}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-indigo-600"
            >
              {downloading ? (
                <>
                  <MiniSpinner />
                  Mengunduh...
                </>
              ) : removingWatermark ? (
                <>
                  <MiniSpinner />
                  Hapus watermark...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Download
                </>
              )}
            </button>

            {/* Dropdown toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              disabled={downloading || removingWatermark}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-indigo-600"
            >
              <ChevronIcon />
            </button>
          </div>

          {/* Dropdown menu */}
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Download original
                </button>
                <button
                  type="button"
                  onClick={handleDownloadWithWatermarkRemoval}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                >
                  <div className="flex items-center gap-1.5">
                    <SparkleIcon />
                    <span>Hapus watermark (AI)</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    Processing 2-5 detik
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MiniSpinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BrokenIcon() {
  return (
    <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 15l5-5 4 4 3-3 6 6" />
      <circle cx="9" cy="9" r="1.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}
