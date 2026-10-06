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

export default function PhotoCard({ photo, isSelected, onToggleSelect, onImageClick, viewMode = "grid" }: PhotoCardProps) {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;
  const [src, setSrc] = useState(proxyUrl);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  useEffect(() => { setSrc(proxyUrl); setLoaded(false); setErrored(false); }, [proxyUrl]);
  const retry = () => { setLoaded(false); setErrored(false); setSrc(`${proxyUrl}&retry=${Date.now()}`); };
  return (
    <article className={`photo-tile ${viewMode === "list" ? "photo-row" : ""} ${isSelected ? "is-selected" : ""}`}>
      <div className="photo-canvas">
        <button type="button" onClick={onImageClick} className="photo-open" aria-label={`Lihat foto ${photo.filename}`}>
          {!errored && <img src={src} alt={photo.title || photo.filename} loading="lazy" onLoad={() => setLoaded(true)} onError={() => { if (!src.startsWith(photo.url)) setSrc(photo.url); else { setErrored(true); setLoaded(true); } }} className={loaded ? "is-loaded" : ""} />}
          {!loaded && !errored && <span className="photo-placeholder" aria-label="Memuat foto" />}
          {errored && <span className="photo-failed">Foto gagal dimuat</span>}
        </button>
        {viewMode === "grid" && <button type="button" className="photo-select" aria-label={`${isSelected ? "Lepas" : "Pilih"} ${photo.filename}`} aria-pressed={isSelected} onClick={onToggleSelect}><span>{isSelected ? "✓" : ""}</span></button>}
      </div>
      <div className="photo-caption">
        <button type="button" className="photo-name" onClick={onImageClick}>{photo.filename}</button>
        <p className="truncate text-xs text-slate-600 dark:text-slate-400">{photo.creator_name || (photo.resolution ? `${photo.resolution.width} × ${photo.resolution.height}` : "Foto")}</p>
        {errored && <button type="button" className="btn-quiet" onClick={retry}>Muat ulang</button>}
      </div>
      {viewMode === "list" && <button type="button" className="photo-select-row" aria-label={`${isSelected ? "Lepas" : "Pilih"} ${photo.filename}`} aria-pressed={isSelected} onClick={onToggleSelect}><span>{isSelected ? "✓" : ""}</span></button>}
    </article>
  );
}
