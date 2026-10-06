"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "@/lib/use-dialog";
import type { Photo } from "@/lib/parse";
import {
  generateCollageCanvas,
  exportCanvasBlob,
  type CollageRatio,
  type CollageTheme,
  type CollageBadgeConfig,
} from "@/lib/collage";
import { downloadBlob, sharePhoto, canWebShareFiles } from "@/lib/download";

interface CollageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotos: Photo[];
  allPhotos: Photo[];
}

const BADGE_PRESETS = [
  { title: "Race finisher", subtitle: "" },
  { title: "Personal best", subtitle: "" },
  { title: "Marathon", subtitle: "" },
  { title: "Cycling", subtitle: "" },
  { title: "Momen favorit", subtitle: "" },
  { title: "Wisuda", subtitle: "" },
];

export default function CollageModal({
  isOpen,
  onClose,
  selectedPhotos,
  allPhotos,
}: CollageModalProps) {
  const photosToUse = useMemo(() => selectedPhotos.length > 0 ? selectedPhotos.slice(0, 9) : allPhotos.slice(0, 4), [selectedPhotos, allPhotos]);

  const [ratio, setRatio] = useState<CollageRatio>("story");
  const [theme, setTheme] = useState<CollageTheme>("minimal");
  const [badgeTitle, setBadgeTitle] = useState<string>("");
  const [badgeSubtitle, setBadgeSubtitle] = useState<string>("");
  const [showPhotographer, setShowPhotographer] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [supportsShare, setSupportsShare] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialog(isOpen, onClose);
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setSupportsShare(canWebShareFiles());
  }, []);

  // Re-render collage canvas whenever settings change
  useEffect(() => {
    if (!isOpen || photosToUse.length === 0) return;

    let isMounted = true;
    setIsRendering(true);
    setError(null);
    setCurrentBlob(null);

    const config: CollageBadgeConfig = {
      title: badgeTitle,
      subtitle: badgeSubtitle,
      showPhotographer,
      theme,
    };

    generateCollageCanvas(photosToUse, ratio, config)
      .then(async (canvas) => {
        if (!isMounted) return;
        previewCanvasRef.current = canvas;
        const blob = await exportCanvasBlob(canvas, "image/jpeg", 0.95);
        if (!isMounted) return;
        setCurrentBlob(blob);
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Kolase gagal dibuat. Periksa koneksi dan coba lagi.");
      })
      .finally(() => {
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, photosToUse, ratio, theme, badgeTitle, badgeSubtitle, showPhotographer]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!currentBlob) return;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "_");
    downloadBlob(currentBlob, `fotoyu_story_collage_${timestamp}.jpg`);
  };

  const handleShare = async () => {
    if (!currentBlob) return;
    try {
      const dummyPhoto: Photo = {
        id: "collage",
        url: "",
        title: badgeTitle,
        filename: "fotoyu_story_card.jpg",
        product_id: "collage",
        creator_name: "",
        content_type: "photo",
        resolution: null,
        size: currentBlob.size,
      };
      if (!await sharePhoto(dummyPhoto, currentBlob)) setError("Kolase tidak dapat dibagikan. Simpan file untuk membagikannya.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kolase gagal dibagikan.");
    }
  };

  const applyPreset = (preset: { title: string; subtitle: string }) => {
    setBadgeTitle(preset.title);
    setBadgeSubtitle(preset.subtitle);
  };

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="collage-title" tabIndex={-1}
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-sheet collage-sheet max-w-4xl">
        {/* Left Side: Live Story/Card Preview */}
        <div className="collage-preview">
          {isRendering ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
               <p role="status" className="text-sm text-slate-300">Membuat kolase…</p>
            </div>
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Story Preview"
              className={[
                "rounded-2xl object-contain shadow-2xl transition-all duration-300",
                 "max-h-full max-w-full",
              ].join(" ")}
            />
          ) : null}
        </div>

        {/* Right Side: Customizer Controls */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 id="collage-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                  Buat kolase
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-quiet" aria-label="Tutup kolase"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mt-3 space-y-3.5">
              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Format / Aspek Rasio:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRatio("story")}
                    className={[
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all active:scale-95",
                      ratio === "story"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    <span>📱 9:16</span>
                    <span className="text-[10px] font-normal opacity-80">Story / Reel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRatio("portrait")}
                    className={[
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all active:scale-95",
                      ratio === "portrait"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    <span>🖼️ 4:5</span>
                    <span className="text-[10px] font-normal opacity-80">Instagram Feed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRatio("square")}
                    className={[
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all active:scale-95",
                      ratio === "square"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    <span>🔲 1:1</span>
                    <span className="text-[10px] font-normal opacity-80">Square Grid</span>
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tema Background:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTheme("gradient")}
                    className={[
                      "p-1.5 rounded-xl border text-xs font-semibold text-center transition-all",
                      theme === "gradient"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    🌌 Gradient Dark
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("glass")}
                    className={[
                      "p-1.5 rounded-xl border text-xs font-semibold text-center transition-all",
                      theme === "glass"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    ✨ Ambient Blur
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("minimal")}
                    className={[
                      "p-1.5 rounded-xl border text-xs font-semibold text-center transition-all",
                      theme === "minimal"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    🖤 Pure Black
                  </button>
                </div>
              </div>

              {/* Quick Badge Presets */}
              <div>
                  <p className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Teks opsional:
                  </p>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-full bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors active:scale-95"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge Text Inputs */}
              <div className="space-y-2">
                <input
                  type="text"
                  aria-label="Judul kolase" placeholder="Judul kolase (opsional)"
                  value={badgeTitle}
                  onChange={(e) => setBadgeTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />

                <input
                  type="text"
                  aria-label="Keterangan kolase" placeholder="Nama acara atau keterangan (opsional)"
                  value={badgeSubtitle}
                  onChange={(e) => setBadgeSubtitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Photographer Attribution Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={showPhotographer}
                  onChange={(e) => setShowPhotographer(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                />
                <span>Sertakan watermark kredit nama fotografer</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {supportsShare && (
              <button
                type="button"
                onClick={handleShare}
                disabled={isRendering || !currentBlob}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>📲</span>
                <span>Share Story</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={isRendering || !currentBlob}
              className="btn-primary flex-1"
            >
              <span>Simpan kolase</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
