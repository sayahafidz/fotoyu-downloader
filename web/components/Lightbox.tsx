"use client";

import { useEffect, useCallback } from "react";
import type { Photo } from "@/lib/parse";
import { downloadPhotoDirect } from "@/lib/download";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index];
  if (!photo) {
    onClose();
    return null;
  }

  const goNext = useCallback(() => {
    const next = (index + 1) % photos.length;
    onNavigate(next);
  }, [index, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    const prev = (index - 1 + photos.length) % photos.length;
    onNavigate(prev);
  }, [index, photos.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sizeText = photo.size > 0 ? formatSize(photo.size) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="Previous"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next */}
      {photos.length > 1 && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="Next"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.title}
          className="max-h-[75vh] max-w-[90vw] rounded-lg object-contain animate-scale-in"
        />

        {/* Info bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
          <span className="font-mono font-medium">{photo.filename}</span>
          {photo.resolution && (
            <span className="text-white/70">
              {photo.resolution.width}x{photo.resolution.height}
            </span>
          )}
          {sizeText && <span className="text-white/70">{sizeText}</span>}
          {photo.creator_name && (
            <span className="text-white/70">by {photo.creator_name}</span>
          )}
          <span className="text-white/50">
            {index + 1} / {photos.length}
          </span>
        </div>

        {/* Download button */}
        <button
          type="button"
          onClick={() => downloadPhotoDirect(photo)}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-white/90"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
