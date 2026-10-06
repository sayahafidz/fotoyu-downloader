"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModeTabs, { type Mode } from "@/components/ModeTabs";
import PasteForm from "@/components/PasteForm";
import TokenForm from "@/components/TokenForm";
import EnhanceForm from "@/components/EnhanceForm";
import BookmarkletSection from "@/components/BookmarkletSection";
import PhotoGrid, { type DownloadMode, type DownloadExecutionOptions } from "@/components/PhotoGrid";
import ProgressOverlay from "@/components/ProgressOverlay";
import HelpSection from "@/components/HelpSection";
import DarkModeToggle from "@/components/DarkModeToggle";
import AndroidGuideModal from "@/components/AndroidGuideModal";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { ToastContainer, useToast } from "@/components/Toast";
import {
  downloadAllWithOptions,
  downloadBatchDirectSequential,
  type DownloadAllProgress,
} from "@/lib/download";
import type { WatermarkRemovalSettings } from "@/lib/watermark-removal";
import {
  fetchCartViaToken,
  loadToken,
  saveToken,
  clearToken,
} from "@/lib/session";
import { extractPhotos } from "@/lib/parse";
import type { Photo } from "@/lib/parse";

type Phase = "idle" | "parsing" | "preview" | "zipping" | "error";

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("bookmarklet");
  const [phase, setPhase] = useState<Phase>("idle");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadAllProgress | null>(null);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isAndroidGuideOpen, setIsAndroidGuideOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const filteredPhotos = useMemo(() => {
    if (!searchQuery.trim()) return photos;
    const q = searchQuery.toLowerCase();
    return photos.filter(
      (p) =>
        p.filename.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.creator_name.toLowerCase().includes(q)
    );
  }, [photos, searchQuery]);

  // Load saved token on mount, and also check URL hash for data passed by
  // the bookmarklet or Android injector:
  //   - #cart=<encoded cart JSON>  -> direct cart data fetched same-site
  //   - #t=<encoded persist:root>  -> token mode (fallback)
  useEffect(() => {
    const t = loadToken();
    setSavedToken(t);

    if (typeof window === "undefined" || !window.location.hash) return;
    const hash = window.location.hash.slice(1);

    // Direct cart JSON from bookmarklet (seamless mode).
    const cartMatch = hash.match(/^cart=(.+)$/);
    if (cartMatch) {
      try {
        const decoded = decodeURIComponent(cartMatch[1]);
        const photos = extractPhotos(decoded);
        if (photos.length > 0) {
          setPhotos(photos);
          setPhase("preview");
          addToast({ type: "success", message: `Berhasil memuat ${photos.length} foto dari cart fotoyu!` });
        } else {
          setError("Cart kosong atau tidak ada foto.");
          setPhase("error");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Data cart dari bookmarklet tidak valid.");
        setPhase("error");
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }

    // Token hash fallback.
    const tokenMatch = hash.match(/^t=(.+)$/);
    if (tokenMatch) {
      try {
        const decoded = decodeURIComponent(tokenMatch[1]);
        if (decoded) {
          setPendingToken(decoded);
          setMode("token");
        }
      } catch {
        // ignore malformed hash
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [addToast]);

  // Handler for paste JSON mode.
  const handleProcessJSON = useCallback(async (raw: string) => {
    setPhase("parsing");
    setError(null);
    try {
      // Local parsing avoids Vercel's request body limit for large cart exports.
      const parsedPhotos = extractPhotos(raw);
      if (parsedPhotos.length === 0) {
        throw new Error("Tidak ada foto yang ditemukan di response.");
      }
      setPhotos(parsedPhotos);
      setSelectedIds(new Set());
      setPhase("preview");
      addToast({ type: "success", message: `${parsedPhotos.length} foto berhasil diproses.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      setError(msg);
      setPhase("error");
    }
  }, [addToast]);

  // Handler for token mode.
  const handleFetchCart = useCallback(async (token: string) => {
    setPhase("parsing");
    setError(null);
    try {
      const photos = await fetchCartViaToken(token);
      if (photos.length === 0) {
        throw new Error("Cart kosong atau tidak ada foto.");
      }
      saveToken(token);
      setSavedToken(token);
      setPhotos(photos);
      setSelectedIds(new Set());
      setPhase("preview");
      addToast({ type: "success", message: `${photos.length} foto ditemukan di cart.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      const status =
        e instanceof Error && "status" in e
          ? (e as Error & { status?: number }).status
          : null;
      if (status === 401) {
        clearToken();
        setSavedToken(null);
      }
      setError(msg);
      setPhase("error");
    }
  }, [addToast]);

  // Unified batch download handler supporting both Direct Sequential and ZIP formats
  const handleDownloadAll = useCallback(
    async ({
      watermarkSettings,
      downloadMode = "direct",
      autoEnhance = false,
      folderByCreator = true,
      photoIds,
    }: DownloadExecutionOptions) => {
      const requestedIds = new Set(photoIds);
      const toDownload = photos.filter(p => requestedIds.has(p.id));
      if (!toDownload.length) {
        addToast({ type: "error", message: "Pilih minimal satu foto untuk diunduh." });
        return;
      }

      setPhase("zipping");
      setError(null);
      setProgress({
        done: 0,
        total: toDownload.length,
        current: "Mempersiapkan pengunduhan...",
        mode: downloadMode,
      });

      const controller = new AbortController();
      setAbortController(controller);

      try {
        let res: { succeeded: number; failed: number };

        if (downloadMode === "direct") {
          // Direct parallel download straight to device / Android downloads folder
          res = await downloadBatchDirectSequential(
            toDownload,
            (p) => setProgress(p),
            {
              removeWatermark: watermarkSettings.enabled,
              watermarkSettings,
              autoEnhance,
            },
            350,
            controller.signal
          );
        } else {
          // Bundled ZIP archive with optional Creator folder structure
          res = await downloadAllWithOptions(
            toDownload,
            (p) => setProgress(p),
            {
              removeWatermark: watermarkSettings.enabled,
              watermarkSettings,
              autoEnhance,
              folderByCreator,
            },
            0,
            controller.signal
          );
        }

        setPhase("preview");
        setProgress(null);
        setSelectedIds(new Set());

        if (res.failed > 0) {
          addToast({
            type: "info",
            message: `${res.succeeded} foto berhasil diunduh (${res.failed} foto gagal).`,
          });
        } else {
          addToast({
            type: "success",
            message:
              downloadMode === "direct"
                 ? `${toDownload.length} foto dikirim ke browser. Izinkan download beberapa file jika diminta.`
                : `${toDownload.length} foto berhasil diunduh sebagai ZIP.`,
          });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          addToast({ type: "info", message: "Proses download dibatalkan." });
          setPhase("preview");
          setProgress(null);
          return;
        }
        const msg = e instanceof Error ? e.message : "Gagal mengunduh.";
        setError(msg);
        setPhase("preview");
        setProgress((p) => (p ? { ...p, current: msg } : null));
        addToast({ type: "error", message: msg });
        setTimeout(() => {
          setProgress(null);
          setError(null);
        }, 4000);
      } finally {
        setAbortController(null);
      }
    },
    [photos, selectedIds, addToast]
  );

  const handleCancelDownload = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  const handleReset = useCallback(() => {
    setPhotos([]);
    setError(null);
    setProgress(null);
    setSearchQuery("");
    setSelectedIds(new Set());
    setPhase("idle");
  }, []);

  const zipping = phase === "zipping";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Hero Header - Compact & Direct on Mobile */}
      <header className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 50% 0%, rgba(99,102,241,0.18) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-4 sm:py-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col items-start gap-1 sm:gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  <span className="text-gradient">Fotoyu</span> Downloader
                </h1>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                  Mobile
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 hidden sm:block">
                Unduh foto resolusi tinggi dari fotoyu.com langsung di Android & PC dalam 1-klik.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <DarkModeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <section className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {phase === "preview" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors active:scale-95"
            >
              <BackIcon />
              Kembali ke Menu Awal
            </button>
          </div>
        )}

        {(phase === "idle" || phase === "parsing" || phase === "error") && (
          <div className="space-y-5">
            <ModeTabs
              mode={mode}
              onChange={setMode}
              onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
            />

            {mode === "bookmarklet" ? (
              <BookmarkletSection
                onTokenReceived={(token) => {
                  setPendingToken(token);
                  setMode("token");
                }}
                onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
              />
            ) : mode === "token" ? (
              <TokenForm
                onFetchCart={handleFetchCart}
                loading={phase === "parsing"}
                pendingToken={pendingToken}
                onPendingTokenConsumed={() => setPendingToken(null)}
              />
            ) : mode === "paste" ? (
              <PasteForm
                onProcess={handleProcessJSON}
                loading={phase === "parsing"}
              />
            ) : (
              <EnhanceForm />
            )}

            {phase === "error" && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40 animate-fade-in shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 font-bold text-xs">
                    ✕
                  </span>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-red-800 dark:text-red-300">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="shrink-0 text-xs font-bold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 underline"
                  >
                    Coba lagi
                  </button>
                </div>
              </div>
            )}

            <HelpSection
              mode={mode}
              onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
            />
          </div>
        )}

        {phase === "preview" && photos.length > 0 && (
          <PhotoGrid
            photos={filteredPhotos}
            allPhotos={photos}
            onDownloadAll={handleDownloadAll}
            zipping={zipping}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
          />
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors mt-12">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>
            Dibuat dengan Next.js · PWA · Tailwind CSS. Bukan berafiliasi dengan fotoyu.com.
          </p>
          <p>Gunakan untuk mendownload foto milikmu sendiri secara legal dan bertanggung jawab.</p>
        </div>
      </footer>

      {/* ZIP / Batch Download Progress Overlay */}
      <ProgressOverlay
        progress={progress}
        error={phase === "zipping" ? null : error && progress ? error : null}
        onClose={() => {
          setProgress(null);
          setError(null);
        }}
        onCancel={phase === "zipping" ? handleCancelDownload : undefined}
      />

      {/* Interactive Android Step-by-Step Guide Modal */}
      <AndroidGuideModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
      />

      {/* PWA Home Screen Install Banner for Android */}
      <PwaInstallBanner />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2.9-.3 2-.4 3-.4s2.1.1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
