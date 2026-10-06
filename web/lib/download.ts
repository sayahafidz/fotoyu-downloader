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
export async function fetchImageBlobViaCanvas(url: string, signal?: AbortSignal): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const finish = (blob: Blob | null) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      img.onload = null;
      img.onerror = null;
      resolve(blob);
    };
    const onAbort = () => { finish(null); img.src = ""; };
    const timer = setTimeout(onAbort, 15000);
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener("abort", onAbort, { once: true });
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            finish(blob);
          },
          "image/jpeg",
          0.95
        );
      } catch {
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = url;
  });
}

/**
 * Fast two-layer fetcher for image blobs:
 * 1. Next.js internal /api/proxy (fast, no CORS issues)
 * 2. Client-side HTML5 Canvas fallback (last resort)
 *
 * Note: public CORS proxies (allorigins/codetabs) were removed because they
 * fail with CORS errors, are rate-limited, and made downloads extremely slow.
 */
export async function fetchImageBlobWithFallbacks(
  url: string,
  signal?: AbortSignal
): Promise<Blob> {
  const encoded = encodeURIComponent(url);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  let lastError = "Gagal mengunduh foto. Coba muat ulang data Fotoyu.";

  // Stream through our server first, then try CDN CORS directly.
  for (const source of [`/api/proxy?url=${encoded}`, url]) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), source.startsWith("/api/") ? 45000 : 15000);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await fetch(source, { signal: controller.signal });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0 && (blob.type.startsWith("image/") || blob.type === "application/octet-stream" || !blob.type)) return blob;
        lastError = "Respons CDN bukan file foto yang valid.";
      } else {
        const detail = await res.json().catch(() => null);
        if (source.startsWith("/api/")) lastError = detail?.error || `Gagal mengunduh foto (HTTP ${res.status}).`;
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  } catch (e) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    // fall through to canvas fallback
  }
  }

  // Layer 2: Client-side HTML5 Canvas fallback
  try {
    const canvasBlob = await fetchImageBlobViaCanvas(url, signal);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (canvasBlob && canvasBlob.size > 0) return canvasBlob;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  throw new Error(lastError);
}

/**
 * Run async tasks with a bounded concurrency pool.
 * Keeps a fast number of parallel downloads while respecting mobile RAM.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }

  const runners = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => runner()
  );
  await Promise.all(runners);
  return results;
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
  stage?: "fetching" | "watermark" | "enhancing" | "saving" | "archiving";
  photo?: { filename: string; url: string };
  archivePercent?: number;
  watermarkEnabled?: boolean;
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

  const report = (stage: DownloadAllProgress["stage"], photo: Photo) => onProgress({ done, total, current: photo.filename, photo: { filename: photo.filename, url: photo.url }, stage, watermarkSuccess, watermarkFailed, watermarkEnabled: Boolean(options?.removeWatermark), mode: "direct" });

  // Browser-triggered individual saves are serial to avoid RAM spikes.
  await runWithConcurrency(photos, 1, async (photo) => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      report("fetching", photo);
      let blob: Blob | null = null;
      try {
        blob = await fetchImageBlobWithFallbacks(photo.url, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        blob = null;
      }

      if (!blob) {
        failed++;
      } else {
        // AI Watermark Removal
        if (options?.removeWatermark && options?.watermarkSettings) {
          try {
            report("watermark", photo);
            const wmRes = await removeWatermark(photo, options.watermarkSettings, signal);
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
            report("enhancing", photo);
            const enh = await enhanceImageCanvas(blob, DEFAULT_ENHANCE_OPTIONS);
            blob = enh.blob;
          } catch {}
        }

        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        report("saving", photo);
        downloadBlob(blob, photo.filename);
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
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
      stage: "saving",
      watermarkEnabled: Boolean(options?.removeWatermark),
    });
  });

  const succeeded = done - failed;
  if (!succeeded && total) throw new Error(`Semua download gagal (${failed}/${total}). Muat ulang data Fotoyu lalu coba lagi.`);
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

  const report = (stage: DownloadAllProgress["stage"], photo: Photo) => onProgress({ done, total, current: photo.filename, photo: { filename: photo.filename, url: photo.url }, stage, watermarkSuccess, watermarkFailed, watermarkEnabled: Boolean(options?.removeWatermark), mode: "zip" });

  // Download in parallel (bounded) so the ZIP is ready much faster.
  await runWithConcurrency(photos, options?.removeWatermark ? 1 : options?.autoEnhance ? 2 : 3, async (photo) => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      report("fetching", photo);
      let blob: Blob | null = null;
      try {
        blob = await fetchImageBlobWithFallbacks(photo.url, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        blob = null;
      }

      if (!blob) {
        failed++;
        done++;
        onProgress({
          done,
          total,
          current: `${done}/${total} foto diproses`,
          watermarkSuccess,
          watermarkFailed,
          mode: "zip",
        });
        return;
      }

      // 1. AI Watermark Removal
      if (options?.removeWatermark && options?.watermarkSettings) {
        try {
          report("watermark", photo);
          const result = await removeWatermark(photo, options.watermarkSettings, signal);
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
          report("enhancing", photo);
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

      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
      watermarkEnabled: Boolean(options?.removeWatermark),
    });
  });

  const succeeded = done - failed;
  if (succeeded > 0) {
    onProgress({
      done,
      total,
      current: "Membuat file ZIP...",
      stage: "archiving",
      archivePercent: 0,
      watermarkEnabled: Boolean(options?.removeWatermark),
      watermarkSuccess,
      watermarkFailed,
      mode: "zip",
    });

    const zipBlob = await zip.generateAsync(
      {
        type: "blob",
        // JPEG/PNG/WebP already compressed; recompression wastes CPU and RAM.
        compression: "STORE",
      },
      (metadata) => {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        onProgress({
          done: total,
          total,
          current: `Membuat ZIP: ${Math.round(metadata.percent)}%`,
          stage: "archiving",
          archivePercent: Math.round(metadata.percent),
          watermarkEnabled: Boolean(options?.removeWatermark),
          watermarkSuccess,
          watermarkFailed,
          mode: "zip",
        });
      }
    );
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "_");
    onProgress({ done, total, current: "Mengirim file ZIP ke browser", stage: "saving", mode: "zip", watermarkEnabled: Boolean(options?.removeWatermark), watermarkSuccess, watermarkFailed });
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
