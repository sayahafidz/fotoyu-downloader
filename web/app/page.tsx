"use client";

import { useCallback, useEffect, useState } from "react";
import ModeTabs, { type Mode } from "@/components/ModeTabs";
import PasteForm from "@/components/PasteForm";
import TokenForm from "@/components/TokenForm";
import EnhanceForm from "@/components/EnhanceForm";
import PhotoGrid from "@/components/PhotoGrid";
import ProgressOverlay from "@/components/ProgressOverlay";
import HelpSection from "@/components/HelpSection";
import { downloadAllDirect, type DownloadAllProgress } from "@/lib/download";
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
  const [mode, setMode] = useState<Mode>("token");
  const [phase, setPhase] = useState<Phase>("idle");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadAllProgress | null>(null);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Load saved token on mount, and also check URL hash for data passed by
  // the bookmarklet:
  //   - #t=<encoded persist:root>  -> token mode (legacy / fallback)
  //   - #cart=<encoded cart JSON>  -> direct cart data fetched same-site
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
        const cartJson = JSON.parse(decoded);
        const photos = extractPhotos(JSON.stringify(cartJson));
        if (photos.length > 0) {
          setPhotos(photos);
          setPhase("preview");
        } else {
          setError("Cart kosong atau tidak ada foto.");
          setPhase("error");
        }
      } catch {
        setError("Data cart dari bookmarklet tidak valid.");
        setPhase("error");
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }

    // Legacy token hash fallback.
    const tokenMatch = hash.match(/^t=(.+)$/);
    if (tokenMatch) {
      try {
        const decoded = decodeURIComponent(tokenMatch[1]);
        if (decoded) {
          setPendingToken(decoded);
        }
      } catch {
        // ignore malformed hash
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  // Handler for paste JSON mode (existing).
  const handleProcessJSON = useCallback(async (raw: string) => {
    setPhase("parsing");
    setError(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal memproses response.");
      }
      if (!data.photos || data.photos.length === 0) {
        throw new Error("Tidak ada foto yang ditemukan di response.");
      }
      setPhotos(data.photos);
      setPhase("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      setError(msg);
      setPhase("error");
    }
  }, []);

  // Handler for token mode (new).
  const handleFetchCart = useCallback(async (token: string) => {
    setPhase("parsing");
    setError(null);
    try {
      const photos = await fetchCartViaToken(token);
      if (photos.length === 0) {
        throw new Error("Cart kosong atau tidak ada foto.");
      }
      // Save token on success.
      saveToken(token);
      setSavedToken(token);
      setPhotos(photos);
      setPhase("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      const status =
        e instanceof Error && "status" in e
          ? (e as Error & { status?: number }).status
          : null;
      // If 401, suggest clearing token.
      if (status === 401) {
        clearToken();
        setSavedToken(null);
      }
      setError(msg);
      setPhase("error");
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    setPhase("zipping");
    setError(null);
    setProgress({ done: 0, total: photos.length, current: "Memulai..." });
    try {
      await downloadAllDirect(photos, (p) => setProgress(p));
      setPhase("preview");
      setProgress(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat ZIP.";
      setError(msg);
      setPhase("preview");
      setProgress((p) => (p ? { ...p, current: msg } : null));
      setTimeout(() => {
        setProgress(null);
        setError(null);
      }, 4000);
    }
  }, [photos]);

  const handleReset = useCallback(() => {
    setPhotos([]);
    setError(null);
    setProgress(null);
    setPhase("idle");
  }, []);

  const zipping = phase === "zipping";

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 50% 0%, rgba(99,102,241,0.18) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="flex flex-col items-start gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Concurrent · Cepat · Gratis
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              <span className="text-gradient">Fotoyu</span> Downloader
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Login dengan token fotoyu, paste response JSON, atau pakai bookmarklet
              1 klik. Unduh semua foto langsung di browser tanpa install.
            </p>
            <a
              href="https://github.com/sayahafidz/fotoyu-downloader"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              <GitHubIcon />
              sayahafidz/fotoyu-downloader
            </a>
          </div>
        </div>
      </header>

      {/* Body */}
      <section className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {phase === "preview" && (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <BackIcon />
              Mulai ulang
            </button>
          </div>
        )}

        {(phase === "idle" || phase === "parsing" || phase === "error") && (
          <div className="space-y-5">
            <ModeTabs mode={mode} onChange={setMode} />

            {mode === "token" ? (
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
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-fade-in">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <HelpSection mode={mode} />
          </div>
        )}

        {phase === "preview" && photos.length > 0 && (
          <PhotoGrid
            photos={photos}
            onDownloadAll={handleDownloadAll}
            zipping={zipping}
          />
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-slate-500">
          Dibuat dengan Next.js · Vercel · Tailwind CSS. Bukan berafiliasi
          dengan fotoyu.com. Gunakan untuk foto milikmu sendiri.
        </div>
      </footer>

      {/* ZIP progress / error overlay */}
      <ProgressOverlay
        progress={progress}
        error={phase === "zipping" ? null : error && progress ? error : null}
      />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
