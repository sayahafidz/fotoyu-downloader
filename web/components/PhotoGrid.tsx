"use client";

import { useMemo, useState } from "react";
import type { Photo } from "@/lib/parse";
import PhotoCard from "./PhotoCard";
import Lightbox from "./Lightbox";
import CollageModal from "./CollageModal";
import WatermarkRemovalSettingsPanel from "./WatermarkRemovalSettings";
import { DEFAULT_WATERMARK_SETTINGS, type WatermarkRemovalSettings } from "@/lib/watermark-removal";

export type DownloadMode = "direct" | "zip";
export type ViewLayout = "grid" | "list";
export interface DownloadExecutionOptions {
  watermarkSettings: WatermarkRemovalSettings;
  downloadMode: DownloadMode;
  autoEnhance: boolean;
  folderByCreator: boolean;
  photoIds: string[];
}
interface PhotoGridProps {
  photos: Photo[];
  allPhotos: Photo[];
  onDownloadAll: (options: DownloadExecutionOptions) => void;
  zipping: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
}

export default function PhotoGrid({ photos, allPhotos, onDownloadAll, zipping, searchQuery, onSearchChange, selectedIds, onSelectedChange }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [watermarkSettings, setWatermarkSettings] = useState(DEFAULT_WATERMARK_SETTINGS);
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("zip");
  const [viewLayout, setViewLayout] = useState<ViewLayout>("grid");
  const [selectedCreator, setSelectedCreator] = useState("");
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [folderByCreator, setFolderByCreator] = useState(true);
  const [isCollageOpen, setIsCollageOpen] = useState(false);
  const creatorStats = useMemo(() => {
    const map = new Map<string, number>();
    allPhotos.forEach((photo) => {
      const name = photo.creator_name?.trim() || "Lainnya";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [allPhotos]);
  const displayedPhotos = useMemo(() => selectedCreator
    ? photos.filter((photo) => (photo.creator_name?.trim() || "Lainnya") === selectedCreator)
    : photos, [photos, selectedCreator]);
  const selectedPhotos = useMemo(() => allPhotos.filter((photo) => selectedIds.has(photo.id)), [allPhotos, selectedIds]);
  const countToDownload = selectedPhotos.length || displayedPhotos.length;
  const hiddenSelectedCount = selectedPhotos.filter((photo) => !displayedPhotos.some((shown) => shown.id === photo.id)).length;
  const isAllSelected = displayedPhotos.length > 0 && displayedPhotos.every((photo) => selectedIds.has(photo.id));

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectedChange(next);
  };
  const selectVisible = () => {
    const next = new Set(selectedIds);
    displayedPhotos.forEach((photo) => {
      if (isAllSelected) next.delete(photo.id); else next.add(photo.id);
    });
    onSelectedChange(next);
  };
  const resetFilters = () => { onSearchChange(""); setSelectedCreator(""); };

  return (
    <div className="gallery space-y-4">
      <div className="gallery-tools space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">{allPhotos.length} foto dimuat · Ketuk foto untuk melihat</p>
          <div className="segmented" aria-label="Tampilan foto">
            <button type="button" aria-pressed={viewLayout === "grid"} onClick={() => setViewLayout("grid")}>Grid</button>
            <button type="button" aria-pressed={viewLayout === "list"} onClick={() => setViewLayout("list")}>Daftar</button>
          </div>
        </div>
        <div className="relative">
          <label htmlFor="photo-search" className="sr-only">Cari foto atau fotografer</label>
          <input id="photo-search" type="search" className="field" placeholder="Cari foto atau fotografer" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
        </div>
        {creatorStats.length > 1 && <div>
          <label htmlFor="creator-filter" className="sr-only">Filter fotografer</label>
          <select id="creator-filter" className="field" value={selectedCreator} onChange={(event) => setSelectedCreator(event.target.value)}>
            <option value="">Semua fotografer</option>
            {creatorStats.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
          </select>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm font-medium">{selectedPhotos.length ? `${selectedPhotos.length} dipilih` : `${displayedPhotos.length} foto ditampilkan`}
            {hiddenSelectedCount > 0 && <span className="block text-sm font-normal text-slate-600 dark:text-slate-400">{hiddenSelectedCount} pilihan di luar filter tetap disertakan.</span>}
          </p>
          <div className="flex gap-1">
            {selectedPhotos.length > 0 && <button type="button" className="btn-quiet" onClick={() => onSelectedChange(new Set())}>Batal pilih</button>}
            <button type="button" className="btn-quiet" disabled={!displayedPhotos.length} onClick={selectVisible}>{isAllSelected ? "Lepas yang tampil" : "Pilih yang tampil"}</button>
          </div>
        </div>
        <section aria-labelledby="download-options-title" className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h2 id="download-options-title" className="text-base font-semibold">Opsi unduhan</h2>
          <WatermarkRemovalSettingsPanel settings={watermarkSettings} photoCount={countToDownload} onChange={setWatermarkSettings} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold">Kolase foto</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Gabungkan hingga 9 pilihan, atau 4 foto pertama.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setIsCollageOpen(true)}>Buat kolase</button>
          </div>
          <div className="space-y-3">
            <label className="setting-row"><input type="checkbox" checked={autoEnhance} onChange={(event) => setAutoEnhance(event.target.checked)} /><span>Koreksi warna otomatis<span className="setting-help">Sesuaikan kecerahan dan kontras saat mengunduh.</span></span></label>
            {downloadMode === "zip" && <label className="setting-row"><input type="checkbox" checked={folderByCreator} onChange={(event) => setFolderByCreator(event.target.checked)} /><span>Folder per fotografer<span className="setting-help">Kelompokkan foto di dalam file ZIP.</span></span></label>}
          </div>
        </section>
      </div>
      {displayedPhotos.length ? <div className={viewLayout === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "space-y-2"}>
        {displayedPhotos.map((photo, index) => <PhotoCard key={photo.id} photo={photo} index={index} isSelected={selectedIds.has(photo.id)} onToggleSelect={() => toggleSelect(photo.id)} onImageClick={() => setLightboxIndex(index)} viewMode={viewLayout} />)}
      </div> : <div className="empty-results">
        <h2 className="text-lg font-semibold">Tidak ada foto yang cocok</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Coba nama lain atau tampilkan semua fotografer.</p>
        <button type="button" className="btn-secondary mt-4" onClick={resetFilters}>Hapus filter</button>
      </div>}
      {lightboxIndex !== null && <Lightbox photos={displayedPhotos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />}
      <div className="download-bar">
        <div className="mx-auto max-w-6xl space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{selectedPhotos.length ? `${selectedPhotos.length} foto dipilih` : `Semua ${displayedPhotos.length} foto yang tampil`}</p>
            <label className="flex items-center gap-2 text-sm"><span className="sr-only">Format unduhan</span>
              <select aria-label="Format unduhan" value={downloadMode} disabled={zipping} onChange={(event) => setDownloadMode(event.target.value as DownloadMode)} className="download-format">
                <option value="zip">File ZIP</option><option value="direct">File terpisah</option>
              </select>
            </label>
          </div>
          <button type="button" className="btn-primary w-full" disabled={zipping || countToDownload === 0} onClick={() => onDownloadAll({ watermarkSettings, downloadMode, autoEnhance, folderByCreator, photoIds: (selectedPhotos.length ? selectedPhotos : displayedPhotos).map((photo) => photo.id) })}>
            {zipping ? "Mengunduh…" : `Unduh ${countToDownload} foto${downloadMode === "zip" ? " sebagai ZIP" : ""}`}
          </button>
          <p className="text-center text-xs text-slate-600 dark:text-slate-400">{downloadMode === "zip" ? "Satu file ZIP. Buka dan ekstrak untuk melihat foto." : "Disimpan di folder unduhan browser, bukan langsung ke galeri."}</p>
        </div>
      </div>
      <CollageModal isOpen={isCollageOpen} onClose={() => setIsCollageOpen(false)} selectedPhotos={selectedPhotos} allPhotos={allPhotos} />
    </div>
  );
}
