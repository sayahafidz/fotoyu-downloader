"use client";

import { useEffect, useRef, useState } from "react";
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
  { title: "🏅 RACE FINISHER", subtitle: "Finish Line Glory · Strong to the End" },
  { title: "🏃 PERSONAL BEST (PB)", subtitle: "New Record · Pace & Endurance" },
  { title: "⚡ MARATHON MEMORY", subtitle: "Full Distance · Unstoppable Spirit" },
  { title: "🚴 CYCLING & TRIATHLON", subtitle: "Pure Speed & High Cadence" },
  { title: "📸 FOTOYU MOMENTS", subtitle: "Captured in Full Resolution" },
  { title: "🎓 GRADUATION DAY", subtitle: "Celebrating Success & Future" },
];

export default function CollageModal({
  isOpen,
  onClose,
  selectedPhotos,
  allPhotos,
}: CollageModalProps) {
  const photosToUse = selectedPhotos.length > 0 ? selectedPhotos.slice(0, 9) : allPhotos.slice(0, 4);

  const [ratio, setRatio] = useState<CollageRatio>("story");
  const [theme, setTheme] = useState<CollageTheme>("gradient");
  const [badgeTitle, setBadgeTitle] = useState<string>("🏅 RACE FINISHER");
  const [badgeSubtitle, setBadgeSubtitle] = useState<string>("Finish Line Glory · Marathon 2026");
  const [showPhotographer, setShowPhotographer] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [supportsShare, setSupportsShare] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setSupportsShare(canWebShareFiles());
  }, []);

  // Re-render collage canvas whenever settings change
  useEffect(() => {
    if (!isOpen || photosToUse.length === 0) return;

    let isMounted = true;
    setIsRendering(true);

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
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch((err) => {
        console.error("Collage generation failed:", err);
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
      await sharePhoto(dummyPhoto, currentBlob);
    } catch (e) {
      console.warn("Share failed:", e);
    }
  };

  const applyPreset = (preset: { title: string; subtitle: string }) => {
    setBadgeTitle(preset.title);
    setBadgeSubtitle(preset.subtitle);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col lg:flex-row rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Left Side: Live Story/Card Preview */}
        <div className="flex flex-1 items-center justify-center bg-slate-950 p-4 sm:p-6 overflow-hidden min-h-[280px] sm:min-h-[420px]">
          {isRendering ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-300">Merender Story Kolase HD...</p>
            </div>
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Story Preview"
              className={[
                "rounded-2xl object-contain shadow-2xl transition-all duration-300",
                ratio === "story" ? "max-h-[65vh] max-w-[260px] sm:max-w-[340px]" : "max-h-[60vh] max-w-[360px]",
              ].join(" ")}
            />
          ) : null}
        </div>

        {/* Right Side: Customizer Controls */}
        <div className="flex flex-1 flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 overflow-y-auto max-h-[50vh] lg:max-h-[92vh] space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Story & Finisher Card Studio
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Preset Badge Cepat:
                </label>
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
                  placeholder="Judul Badge (mis: 🏅 RACE FINISHER)"
                  value={badgeTitle}
                  onChange={(e) => setBadgeTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />

                <input
                  type="text"
                  placeholder="Sub-judul (mis: Jakarta Marathon 2026 · PB 3:45)"
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 disabled:opacity-50 transition-all"
            >
              <span>💾</span>
              <span>Download Kolase (HD)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
