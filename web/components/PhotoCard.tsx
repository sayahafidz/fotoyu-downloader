"use client";

import { useEffect, useState } from "react";
import type { Photo } from "@/lib/parse";
import type { WatermarkRemovalSettings } from "@/lib/watermark-removal";

interface PhotoCardProps {
  photo: Photo;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onImageClick: () => void;
  viewMode?: "grid" | "list";
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
  viewMode = "grid",
}: PhotoCardProps) {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;
  const [src, setSrc] = useState<string>(proxyUrl);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setSrc(proxyUrl);
    setLoaded(false);
    setErrored(false);
  }, [proxyUrl]);

  // List View Mode (Compact row for tablet/desktop)
  if (viewMode === "list") {
    return (
      <div
        className={[
          "flex items-center gap-3.5 rounded-2xl border p-2.5 sm:p-3 transition-all animate-slide-up",
          isSelected
            ? "border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30"
            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900",
        ].join(" ")}
      >
        {/* Selection Checkbox */}
        <button
          type="button"
          onClick={onToggleSelect}
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-90",
            isSelected
              ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
              : "border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-800",
          ].join(" ")}
        >
          {isSelected && <CheckIcon />}
        </button>

        {/* Thumbnail Preview */}
        <div
          role="button"
          tabIndex={0}
          onClick={onImageClick}
          className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
        >
          {!errored ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={photo.title}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => {
                if (src === proxyUrl) setSrc(photo.url);
                else setErrored(true);
              }}
              className={[
                "h-full w-full object-cover transition-opacity",
                loaded ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">✕</div>
          )}
        </div>

        {/* Details */}
        <div
          role="button"
          tabIndex={0}
          onClick={onImageClick}
          className="flex flex-1 min-w-0 flex-col cursor-pointer"
        >
          <p className="truncate font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            {photo.filename}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {photo.resolution && <span>{photo.resolution.width}×{photo.resolution.height}</span>}
            {photo.size > 0 && <span>· {formatSize(photo.size)}</span>}
            {photo.creator_name && <span className="truncate">· {photo.creator_name}</span>}
          </div>
        </div>

        {/* Index Badge */}
        <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500">
          #{index + 1}
        </span>
      </div>
    );
  }

  // Grid View Mode (Clean, Modern, Decluttered Google Photos Tile)
  return (
    <div
      className={[
        "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 animate-slide-up select-none",
        isSelected
          ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
      ].join(" ")}
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
    >
      {/* Image Canvas Tile */}
      <div
        role="button"
        tabIndex={0}
        onClick={onImageClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onImageClick();
          }
        }}
        className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden bg-slate-100 dark:bg-slate-950 focus:outline-none"
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
              "h-full w-full object-cover transition-all duration-300",
              loaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
              "group-hover:scale-105",
            ].join(" ")}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center">
            <span className="text-slate-400 text-lg">🖼️</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Gagal muat</p>
          </div>
        )}

        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500 dark:border-slate-700 dark:border-t-indigo-400" />
          </div>
        )}

        {/* Minimal Index Badge (Top Left) */}
        <div className="absolute left-2 top-2 rounded-lg bg-black/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-md">
          #{index + 1}
        </div>

        {/* Thumb-Friendly Selection Button (Top Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={[
            "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl border-2 transition-all active:scale-90 shadow-md",
            isSelected
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-white/90 bg-black/40 text-transparent hover:border-white hover:bg-black/60",
          ].join(" ")}
          aria-label={isSelected ? "Batalkan pilihan" : "Pilih foto ini"}
        >
          {isSelected ? (
            <CheckIcon />
          ) : (
            <div className="h-3 w-3 rounded-full border border-white/60" />
          )}
        </button>

        {/* Minimal Info Gradient Overlay at Bottom */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white transition-opacity">
          <p className="truncate font-mono text-[11px] font-bold leading-tight">
            {photo.filename}
          </p>
          <div className="flex items-center justify-between text-[10px] text-white/80 mt-0.5">
            <span>{photo.resolution ? `${photo.resolution.width}×${photo.resolution.height}` : ""}</span>
            {photo.size > 0 && <span>{formatSize(photo.size)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
