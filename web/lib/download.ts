// Browser-side helpers for triggering downloads. Individual downloads use
// <a download> for simplicity. The "download all" flow creates a ZIP archive
// by fetching images through the proxy (which has CORS headers and retry logic)
// and bundling them using JSZip.

import JSZip from "jszip";
import type { Photo } from "./parse";
import { removeWatermark, type WatermarkRemovalSettings } from "./watermark-removal";

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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Fallback to fetch image blob via HTML5 Canvas DOM rendering.
 * Runs directly inside user browser context where IP blocking is avoided.
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
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.95);
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
 * 2. wsrv.nl public proxy
 * 3. corsproxy.io public proxy
 * 4. Client-side HTML5 Canvas draw fallback
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

  // Layer 2: wsrv.nl public CORS proxy
  try {
    const res = await fetch(`https://wsrv.nl/?url=${encoded}&output=auto`, { signal });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return blob;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  // Layer 3: corsproxy.io public CORS proxy
  try {
    const res = await fetch(`https://corsproxy.io/?${encoded}`, { signal });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return blob;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  // Layer 4: Client-side HTML5 Canvas fallback (bypasses CORS restrictions if image cached)
  try {
    const canvasBlob = await fetchImageBlobViaCanvas(url);
    if (canvasBlob && canvasBlob.size > 0) return canvasBlob;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
  }

  throw new Error("Gagal mengunduh foto dari server proxy maupun canvas fallback.");
}

// Download a single photo automatically to the user's downloads folder without redirecting or opening tabs.
export async function downloadPhotoDirect(photo: Photo): Promise<void> {
  const blob = await fetchImageBlobWithFallbacks(photo.url);
  downloadBlob(blob, photo.filename);
}

// Download a single photo with optional watermark removal
export async function downloadPhotoWithOptions(
  photo: Photo,
  options?: {
    removeWatermark?: boolean;
    watermarkSettings?: WatermarkRemovalSettings;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!options?.removeWatermark || !options?.watermarkSettings) {
    // No watermark removal, use direct download
    await downloadPhotoDirect(photo);
    return { success: true };
  }

  try {
    const result = await removeWatermark(photo, options.watermarkSettings);

    if (result.success && result.processedImageBlob) {
      // Download processed image
      downloadBlob(result.processedImageBlob, photo.filename);

      // Clean up object URL
      if (result.processedImageUrl) {
        const urlToRevoke = result.processedImageUrl;
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 5000);
      }

      return { success: true };
    } else {
      // Fallback to original on failure
      await downloadPhotoDirect(photo);
      return { success: false, error: result.error || "Watermark removal failed" };
    }
  } catch (error) {
    // Fallback to original on error
    await downloadPhotoDirect(photo);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export interface DownloadAllProgress {
  done: number;
  total: number;
  current: string;
  watermarkSuccess?: number;
  watermarkFailed?: number;
}

// Download all photos as a single ZIP file. Fetches images using robust fallbacks,
// bundles them using JSZip, and triggers a single download of the ZIP archive.
export async function downloadAllDirect(
  photos: Photo[],
  onProgress: (p: DownloadAllProgress) => void,
  delayMs = 500,
  signal?: AbortSignal
): Promise<{ succeeded: number; failed: number }> {
  const zip = new JSZip();
  const total = photos.length;
  let done = 0;
  let failed = 0;

  // Fetch and add each photo to the ZIP
  for (const photo of photos) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onProgress({ 
      done, 
      total, 
      current: `Mengunduh ${photo.filename}...` 
    });

    try {
      const blob = await fetchImageBlobWithFallbacks(photo.url, signal);
      zip.file(photo.filename, blob);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      console.error(`Error downloading ${photo.filename}:`, error);
      failed += 1;
    }

    done += 1;
    onProgress({ 
      done, 
      total, 
      current: `${done}/${total} selesai${failed > 0 ? ` (${failed} gagal)` : ''}` 
    });

    // Small delay to avoid overwhelming the server
    if (done < total) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  // Generate and download the ZIP
  const succeeded = done - failed;
  if (succeeded > 0) {
    onProgress({ 
      done, 
      total, 
      current: 'Membuat file ZIP...' 
    });

    const zipBlob = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    const filename = `fotoyu_photos_${timestamp}.zip`;
    
    downloadBlob(zipBlob, filename);

    onProgress({ 
      done, 
      total, 
      current: `Selesai! ${succeeded} foto diunduh${failed > 0 ? `, ${failed} gagal` : ''}` 
    });
    return { succeeded, failed };
  } else {
    throw new Error(`Semua download gagal (${failed}/${total})`);
  }
}

// Download all photos with optional watermark removal as a single ZIP file.
// This handles watermark removal with proper progress tracking and ZIP bundling.
export async function downloadAllWithOptions(
  photos: Photo[],
  onProgress: (p: DownloadAllProgress) => void,
  options?: {
    removeWatermark?: boolean;
    watermarkSettings?: WatermarkRemovalSettings;
  },
  delayMs = 500,
  signal?: AbortSignal
): Promise<{ succeeded: number; failed: number }> {
  if (!options?.removeWatermark || !options?.watermarkSettings) {
    // No watermark removal, use direct ZIP download
    return downloadAllDirect(photos, onProgress, delayMs, signal);
  }

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
    });

    try {
      let blob: Blob | null = null;
      // 1. Fetch original via multi-layer fallback fetcher
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

      // 2. Try watermark removal
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

      zip.file(photo.filename, blob);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      failed++;
    }

    done++;
    onProgress({
      done,
      total,
      current: `${done}/${total} selesai`,
      watermarkSuccess,
      watermarkFailed,
    });

    if (done < total) {
      await new Promise((r) => setTimeout(r, options.removeWatermark ? 1000 : delayMs));
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
    });
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "_");
    downloadBlob(zipBlob, `fotoyu_photos_${timestamp}.zip`);
    return { succeeded, failed };
  }
  throw new Error(`Semua download gagal (${failed}/${total})`);
}
