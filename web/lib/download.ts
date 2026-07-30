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

// Download a single photo automatically to the user's downloads folder.
// Multi-layer strategy chain, each layer tries a different proxy until
// the image is fetched as a Blob, then saved via <a download> on a blob URL.
export async function downloadPhotoDirect(photo: Photo): Promise<void> {
  const encoded = encodeURIComponent(photo.url);

  // Strategy 1: Our own Vercel proxy (may be blocked by CDN datacenter IP filter).
  // The proxy now has its own public-proxy fallback built in, so it succeeds
  // even when Vercel IPs are blocked.
  try {
    const proxyUrl = `/api/proxy?url=${encoded}&mode=download&filename=${encodeURIComponent(photo.filename)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const blob = await response.blob();
      downloadBlob(blob, photo.filename);
      return;
    }
  } catch {
    // Will try next strategy.
  }

  // Strategy 2: wsrv.nl public image proxy (non-Vercel IP, supports CORS).
  try {
    const wsrvUrl = `https://wsrv.nl/?url=${encoded}&output=auto`;
    const response = await fetch(wsrvUrl);
    if (response.ok) {
      const blob = await response.blob();
      downloadBlob(blob, photo.filename);
      return;
    }
  } catch {
    // Will try next strategy.
  }

  // Strategy 3: imgproxy.gamma.app (Cloudflare-based, supports CORS).
  try {
    const gammaUrl = `https://imgproxy.gamma.app/${encoded}`;
    const response = await fetch(gammaUrl);
    if (response.ok) {
      const blob = await response.blob();
      downloadBlob(blob, photo.filename);
      return;
    }
  } catch {
    // Will try last resort.
  }

  // Last resort: open image in a new tab so user can save manually.
  window.open(photo.url, "_blank");
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

// Download all photos as a single ZIP file. Fetches images through the proxy
// (which has CORS headers and retry logic), bundles them using JSZip, and
// triggers a single download of the ZIP archive.
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
      // Fetch through proxy which has CORS headers
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;
      const response = await fetch(proxyUrl, { signal });

      if (!response.ok) {
        // If proxy fails, try wsrv.nl public proxy (different IP range)
        try {
          const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(photo.url)}&output=auto`;
          const wsrvResponse = await fetch(wsrvUrl, { signal });
          if (wsrvResponse.ok) {
            const blob = await wsrvResponse.blob();
            zip.file(photo.filename, blob);
          } else {
            console.warn(`Gagal mengunduh ${photo.filename}, skip.`);
            failed += 1;
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          console.warn(`Gagal mengunduh ${photo.filename}, skip.`);
          failed += 1;
        }
      } else {
        const blob = await response.blob();
        zip.file(photo.filename, blob);
      }
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
      // 1. Fetch original via proxy
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;
      let blob: Blob | null = null;
      const response = await fetch(proxyUrl, { signal });
      if (response.ok) {
        blob = await response.blob();
      } else {
        // fallback wsrv.nl
        const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(photo.url)}&output=auto`;
        const wsrv = await fetch(wsrvUrl, { signal });
        if (wsrv.ok) {
          blob = await wsrv.blob();
        }
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
