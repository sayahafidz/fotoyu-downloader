// Browser-side helpers for triggering downloads and native mobile sharing.
// Supports:
// 1. Direct individual download (saves directly to Downloads/Gallery)
// 2. Direct sequential batch download (mobile memory-friendly)
// 3. Bundled ZIP archive (with in-browser JSZip)
// 4. Folder structure by photographer/creator in ZIP
// 5. In-browser client-side Auto-Enhance & rainbow streak healing
// 6. Android Web Share Target API (share directly to WhatsApp, Drive, Gallery)
// 7. Watermark removal pipeline with fallback

import JSZip from "jszip";
import type { Photo } from "./parse";
import { removeWatermark, type WatermarkRemovalSettings } from "./watermark-removal";
import { enhanceImageCanvas, type EnhanceOptions, DEFAULT_ENHANCE_OPTIONS } from "./canvas-enhance";

// Trigger a browser download for a Blob with the given filename.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a small delay so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Check if the current browser (especially Android Chrome/Samsung Internet)
 * supports native Web Share API with files.
 */
export function canWebShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  if (!navigator.canShare) return false;
  try {
    const testFile = new File([""], "test.jpg", { type: "image/jpeg" });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Share a photo blob or file directly to Android native apps (WhatsApp, Gallery, Drive).
 */
export async function sharePhoto(
  photo: Photo,
  blob: Blob
): Promise<boolean> {
  if (!canWebShareFiles()) return false;
  try {
    const file = new File([blob], photo.filename, {
      type: blob.type || "image/jpeg",
    });
    await navigator.share({
      title: photo.title || photo.filename,
      text: `Foto dari Fotoyu: ${photo.filename}`,
      files: [file],
    });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return true;
    }
    console.warn("[WebShare] Failed:", e);
    return false;
  }
}

/**
 * Fallback to fetch image blob via HTML5 Canvas DOM rendering.
 */
export async function fetchImageBlobViaCanvas(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.95
        );
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Robust multi-layer fetcher for image blobs:
 * 1. Next.js /api/proxy
 * 2. Public open CORS/image proxies (allorigins, codetabs)
 * 3. Client-side HTML5 Canvas draw fallback
 */
export async function fetchImageBlobWithFallbacks(
  url: string,
  signal?: AbortSignal
): Promise<Blob> {
  const encoded = encodeURIComponent(url);

  // Layer 1: Next.js API Proxy
  try {
    const res = await fetch(`/api/proxy?url=${encoded}`, { signal });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return blob;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  // Layer 2: allorigins public CORS proxy
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encoded}`, { signal });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return blob;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  // Layer 3: Codetabs / open CORS proxy fallback
  try {
    const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encoded}`, { signal });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return blob;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  // Layer 4: Client-side HTML5 Canvas fallback
  try {
    const canvasBlob = await fetchImageBlobViaCanvas(url);
    if (canvasBlob && canvasBlob.size > 0) return canvasBlob;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  throw new Error("Gagal mengunduh foto dari server proxy maupun fallback.");
}

// Download a single photo automatically to the user's downloads folder.
export async function downloadPhotoDirect(
  photo: Photo,
  autoEnhance = false
): Promise<void> {
  let blob = await fetchImageBlobWithFallbacks(photo.url);
  if (autoEnhance) {
    try {
      const enhanced = await enhanceImageCanvas(blob, DEFAULT_ENHANCE_OPTIONS);
      blob = enhanced.blob;
    } catch {}
  }
  downloadBlob(blob, photo.filename);
}

export interface DownloadAllProgress {
  done: number;
  total: number;
  current: string;
  speed?: string;
  watermarkSuccess?: number;
  watermarkFailed?: number;
  mode?: "zip" | "direct";
}

export interface AdvancedDownloadOptions {
  removeWatermark?: boolean;
  watermarkSettings?: WatermarkRemovalSettings;
  autoEnhance?: boolean;
  folderByCreator?: boolean;
}

/**
 * Mobile-First Direct Sequential Download
 */
export async function downloadBatchDirectSequential(
  photos: Photo[],
  onProgress: (p: DownloadAllProgress) => void,
  options?: AdvancedDownloadOptions,
  delayMs = 350,
  signal?: AbortSignal
): Promise<{ succeeded: number; failed: number }> {
  const total = photos.length;
  let done = 0;
  let failed = 0;
  let watermarkSuccess = 0;
  let watermarkFailed = 0;

  for (const photo of photos) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onProgress({
      done,
      total,
      current: `Menyimpan ${photo.filename} ke galeri...`,
      watermarkSuccess,
      watermarkFailed,
      mode: "direct",
    });

    try {
      let blob: Blob | null = null;
      try {
        blob = await fetchImageBlobWithFallbacks(photo.url, signal);
      } catch {
        blob = null;
      }

      if (!blob) {
        failed++;
      } else {
        // AI Watermark Removal
        if (options?.removeWatermark && options?.watermarkSettings) {
          try {
            const wmRes = await removeWatermark(photo, options.watermarkSettings);
            if (wmRes.success && wmRes.processedImageBlob) {
              blob = wmRes.processedImageBlob;
              watermarkSuccess++;
            } else {
              watermarkFailed++;
            }
          } catch {
            watermarkFailed++;
          }
        }

        // Offline Client-Side Auto-Enhance
        if (options?.autoEnhance) {
          try {
            const enh = await enhanceImageCanvas(blob, DEFAULT_ENHANCE_OPTIONS);
            blob = enh.blob;
          } catch {}
        }

        downloadBlob(blob, photo.filename);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      failed++;
    }

    done++;
    onProgress({
      done,
      total,
      current: `${done}/${total} tersimpan${failed > 0 ? ` (${failed} gagal)` : ""}`,
      watermarkSuccess,
      watermarkFailed,
      mode: "direct",
    });

    if (done < total) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const succeeded = done - failed;
  return { succeeded, failed };
}

/**
 * Download all photos with options (ZIP + Folders by Creator + Auto Enhance + AI)
 */
export async function downloadAllWithOptions(
  photos: Photo[],
  onProgress: (p: DownloadAllProgress) => void,
  options?: AdvancedDownloadOptions,
  delayMs = 250,
  signal?: AbortSignal
): Promise<{ succeeded: number; failed: number }> {
  const zip = new JSZip();
  const total = photos.length;
  let done = 0;
  let failed = 0;
  let watermarkSuccess = 0;
  let watermarkFailed = 0;

  for (const photo of photos) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onProgress({
      done,
      total,
      current: `Mengunduh ${photo.filename}...`,
      watermarkSuccess,
      watermarkFailed,
      mode: "zip",
    });

    try {
      let blob: Blob | null = null;
      try {
        blob = await fetchImageBlobWithFallbacks(photo.url, signal);
      } catch {
        blob = null;
      }

      if (!blob) {
        failed++;
        done++;
        continue;
      }

      // 1. AI Watermark Removal
      if (options?.removeWatermark && options?.watermarkSettings) {
        try {
          const result = await removeWatermark(photo, options.watermarkSettings);
          if (result.success && result.processedImageBlob) {
            blob = result.processedImageBlob;
            watermarkSuccess++;
          } else {
            watermarkFailed++;
          }
        } catch {
          watermarkFailed++;
        }
      }

      // 2. Offline Client-Side Auto-Enhance
      if (options?.autoEnhance) {
        try {
          const enh = await enhanceImageCanvas(blob, DEFAULT_ENHANCE_OPTIONS);
          blob = enh.blob;
        } catch {}
      }

      // 3. Organize by Creator folder in ZIP if enabled
      let zipPath = photo.filename;
      if (options?.folderByCreator && photo.creator_name) {
        const safeCreator = photo.creator_name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
        zipPath = `${safeCreator}/${photo.filename}`;
      }

      zip.file(zipPath, blob);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      failed++;
    }

    done++;
    onProgress({
      done,
      total,
      current: `${done}/${total} foto diproses`,
      watermarkSuccess,
      watermarkFailed,
      mode: "zip",
    });

    if (done < total) {
      await new Promise((r) => setTimeout(r, options?.removeWatermark ? 400 : delayMs));
    }
  }

  const succeeded = done - failed;
  if (succeeded > 0) {
    onProgress({
      done,
      total,
      current: "Membuat file ZIP...",
      watermarkSuccess,
      watermarkFailed,
      mode: "zip",
    });

    const zipBlob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        onProgress({
          done: total,
          total,
          current: `Membuat ZIP: ${Math.round(metadata.percent)}%`,
          watermarkSuccess,
          watermarkFailed,
          mode: "zip",
        });
      }
    );

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "_");
    downloadBlob(zipBlob, `fotoyu_photos_${timestamp}.zip`);
    return { succeeded, failed };
  }
  throw new Error(`Semua download gagal (${failed}/${total})`);
}

export async function downloadAllDirect(
  photos: Photo[],
  onProgress: (p: DownloadAllProgress) => void,
  delayMs = 250,
  signal?: AbortSignal
): Promise<{ succeeded: number; failed: number }> {
  return downloadAllWithOptions(photos, onProgress, undefined, delayMs, signal);
}
