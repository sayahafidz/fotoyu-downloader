"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { Photo } from "@/lib/parse";
import { downloadPhotoDirect, fetchImageBlobWithFallbacks, sharePhoto, canWebShareFiles, downloadBlob } from "@/lib/download";
import { enhanceImageCanvas, DEFAULT_ENHANCE_OPTIONS } from "@/lib/canvas-enhance";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index];
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [supportsShare, setSupportsShare] = useState(false);

  // Before/After Enhancement State
  const [showCompare, setShowCompare] = useState(false);
  const [enhancedDataUrl, setEnhancedDataUrl] = useState<string | null>(null);
  const [enhancedBlob, setEnhancedBlob] = useState<Blob | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100%
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupportsShare(canWebShareFiles());
  }, []);

  // Reset comparison state on photo switch
  useEffect(() => {
    setShowCompare(false);
    setEnhancedDataUrl(null);
    setEnhancedBlob(null);
    setSliderPos(50);
  }, [index]);

  const goNext = useCallback(() => {
    setIsZoomed(false);
    const next = (index + 1) % photos.length;
    onNavigate(next);
  }, [index, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    setIsZoomed(false);
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

  // Touch gesture handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomed || isDraggingSlider) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchDelta({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || isZoomed || isDraggingSlider) return;
    const touch = e.touches[0];
    setTouchDelta({
      x: touch.clientX - touchStart.x,
      y: touch.clientY - touchStart.y,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || isZoomed || isDraggingSlider) return;
    const threshold = 50;
    const { x, y } = touchDelta;

    if (Math.abs(x) > Math.abs(y) && Math.abs(x) > threshold) {
      if (x < 0) goNext();
      else goPrev();
    } else if (y > threshold * 1.5 && Math.abs(y) > Math.abs(x)) {
      onClose();
    }

    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
  };

  // Trigger real-time client-side enhance
  const handleToggleEnhanceCompare = async () => {
    if (showCompare) {
      setShowCompare(false);
      return;
    }

    if (enhancedDataUrl) {
      setShowCompare(true);
      return;
    }

    if (!photo) return;
    setIsEnhancing(true);
    try {
      const blob = await fetchImageBlobWithFallbacks(photo.url);
      const res = await enhanceImageCanvas(blob, DEFAULT_ENHANCE_OPTIONS);
      setEnhancedDataUrl(res.dataUrl);
      setEnhancedBlob(res.blob);
      setShowCompare(true);
    } catch (e) {
      console.warn("Enhance comparison failed:", e);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Slider dragging logic for Split Comparison
  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPos(percent);
  };

  const handleShare = async () => {
    if (!photo) return;
    setSharing(true);
    try {
      const blob = (showCompare && enhancedBlob) ? enhancedBlob : await fetchImageBlobWithFallbacks(photo.url);
      await sharePhoto(photo, blob);
    } catch (e) {
      console.warn("Share failed:", e);
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!photo) return;
    setDownloading(true);
    try {
      if (showCompare && enhancedBlob) {
        downloadBlob(enhancedBlob, `enhanced_${photo.filename}`);
      } else {
        await downloadPhotoDirect(photo);
      }
    } finally {
      setDownloading(false);
    }
  };

  if (!photo) {
    onClose();
    return null;
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sizeText = photo.size > 0 ? formatSize(photo.size) : null;
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-black/95 p-3 sm:p-5 backdrop-blur-md animate-fade-in select-none"
      onClick={handleBackdrop}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="flex w-full max-w-4xl items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-semibold text-white backdrop-blur-sm">
            {index + 1} / {photos.length}
          </span>
          <span className="hidden sm:inline-block max-w-xs truncate font-mono text-xs text-white/80">
            {photo.filename}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Compare / Enhance Button */}
          <button
            type="button"
            onClick={handleToggleEnhanceCompare}
            disabled={isEnhancing}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-md",
              showCompare
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-400/50"
                : "bg-white/15 text-white hover:bg-white/25",
            ].join(" ")}
          >
            {isEnhancing ? (
              <span className="animate-spin text-xs">⏳</span>
            ) : (
              <span>✨</span>
            )}
            <span>{showCompare ? "Bandingkan Aktif" : "Preview Enhance"}</span>
          </button>

          {/* Zoom toggle button */}
          {!showCompare && (
            <button
              type="button"
              onClick={() => setIsZoomed((z) => !z)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95"
              aria-label="Toggle Zoom"
            >
              {isZoomed ? <ZoomOutIcon /> : <ZoomInIcon />}
            </button>
          )}

          {/* Share button */}
          {supportsShare && (
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/90 text-white backdrop-blur-sm transition-all hover:bg-indigo-600 active:scale-95 disabled:opacity-50"
              aria-label="Share ke WhatsApp / Galeri"
            >
              <ShareIcon />
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop Navigation Arrows */}
      {photos.length > 1 && !showCompare && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="hidden sm:flex absolute left-4 top-1/2 z-10 h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-90"
            aria-label="Previous"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={goNext}
            className="hidden sm:flex absolute right-4 top-1/2 z-10 h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-90"
            aria-label="Next"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Main Image / Interactive Comparison Slider Viewport */}
      <div
        className="relative flex flex-1 w-full items-center justify-center overflow-hidden my-auto"
        style={{
          transform: !isZoomed && !showCompare && touchDelta.x !== 0 ? `translateX(${touchDelta.x * 0.7}px)` : undefined,
          transition: touchStart ? "none" : "transform 0.2s ease-out",
        }}
      >
        {showCompare && enhancedDataUrl ? (
          /* Split Before/After Slider */
          <div
            ref={sliderRef}
            className="relative max-h-[72vh] max-w-[94vw] sm:max-w-[85vw] overflow-hidden rounded-2xl shadow-2xl select-none"
            onMouseMove={(e) => {
              if (isDraggingSlider || e.buttons === 1) handleSliderMove(e.clientX);
            }}
            onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
            onMouseDown={() => setIsDraggingSlider(true)}
            onMouseUp={() => setIsDraggingSlider(false)}
          >
            {/* Enhanced Image (Background Base) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enhancedDataUrl}
              alt="Enhanced"
              className="max-h-[72vh] w-auto rounded-2xl object-contain pointer-events-none"
            />
            <span className="absolute right-3 top-3 rounded-md bg-emerald-600/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm z-10 pointer-events-none">
              ✨ Sesudah (Enhanced)
            </span>

            {/* Original Image (Clipped Overlay on the Left) */}
            <div
              className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none"
              style={{ width: `${sliderPos}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxyUrl}
                alt="Original"
                className="max-h-[72vh] max-w-none rounded-2xl object-contain"
                style={{ width: sliderRef.current?.offsetWidth }}
              />
              <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                Sebelum (Original)
              </span>
            </div>

            {/* Divider Line & Handle */}
            <div
              className="absolute inset-y-0 w-0.5 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl border border-slate-300 active:scale-110 transition-transform">
                <span className="text-xs font-black">↔</span>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Single Image View */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyUrl}
            alt={photo.title}
            onClick={() => setIsZoomed((z) => !z)}
            className={[
              "rounded-2xl object-contain transition-all duration-300",
              isZoomed
                ? "max-h-none max-w-none scale-150 cursor-zoom-out overflow-auto"
                : "max-h-[72vh] max-w-[94vw] sm:max-w-[85vw] cursor-zoom-in",
            ].join(" ")}
          />
        )}
      </div>

      {/* Bottom Action & Metadata Bar */}
      <div className="flex w-full max-w-xl flex-col sm:flex-row items-center justify-between gap-2.5 rounded-2xl bg-slate-900/85 p-3 text-white backdrop-blur-xl border border-white/10 z-20">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-white/80">
          <span className="font-mono font-bold text-white truncate max-w-[160px]">{photo.filename}</span>
          {photo.resolution && (
            <span>{photo.resolution.width}×{photo.resolution.height}</span>
          )}
          {sizeText && <span>· {sizeText}</span>}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {supportsShare && (
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <ShareIcon />
              <span>Share</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-50 transition-all"
          >
            {downloading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <DownloadIcon />
            )}
            <span>{showCompare ? "Simpan Enhanced" : "Simpan Foto"}</span>
          </button>
        </div>
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

function ZoomInIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
