"use client";

import { useState } from "react";
import type { Photo } from "@/lib/parse";
import { downloadBlob, fetchPhotoBlob } from "@/lib/download";

interface PhotoCardProps {
  photo: Photo;
  index: number;
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

export default function PhotoCard({ photo, index }: PhotoCardProps) {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;
  const [src, setSrc] = useState<string>(proxyUrl);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await fetchPhotoBlob(photo);
      downloadBlob(blob, photo.filename);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengunduh.";
      alert(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100">
        {!errored ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={photo.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => {
              // First failure: assume the server-side proxy was blocked by
              // the upstream CDN (datacenter IP → 403). Retry with the
              // direct CDN URL; the browser fetches from the user's IP,
              // which is usually allowed.
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
            <p className="text-xs text-slate-500">Gagal memuat pratinjau</p>
          </div>
        )}

        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
          </div>
        )}

        <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-mono font-medium text-white backdrop-blur-sm">
          #{index + 1}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p
          className="truncate font-mono text-xs font-medium text-slate-700"
          title={photo.filename}
        >
          {photo.filename}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          {photo.resolution && (
            <span>
              {photo.resolution.width}×{photo.resolution.height}
            </span>
          )}
          {photo.size > 0 && <span>· {formatSize(photo.size)}</span>}
          {photo.creator_name && (
            <span className="truncate">· {photo.creator_name}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? (
            <>
              <MiniSpinner />
              Mengunduh...
            </>
          ) : (
            <>
              <DownloadIcon />
              Download
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MiniSpinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrokenIcon() {
  return (
    <svg
      className="h-8 w-8 text-slate-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 15l5-5 4 4 3-3 6 6" />
      <circle cx="9" cy="9" r="1.5" />
    </svg>
  );
}
