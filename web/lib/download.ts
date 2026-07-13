// Browser-side helpers for triggering downloads. The "download all" flow uses
// individual <a download> clicks (staggered) instead of building a ZIP in
// JS, because the upstream CDN blocks server-side fetches (datacenter IP →
// 403) and direct browser fetch() calls (no CORS headers). The <a download>
// attribute tells the browser to fetch the image via its own network stack
// (user IP, no CORS restriction) and save it to disk.

import type { Photo } from "./parse";

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

// Download a single photo. The proxy is blocked by the upstream CDN
// (datacenter IP → 403), and the direct URL is blocked by CORS when
// fetched with fetch(). So we use an invisible <a download> element
// which tells the browser to fetch the image via its own network stack
// (user IP, no CORS restriction) and save it to disk.
export function downloadPhotoDirect(photo: Photo): void {
  const a = document.createElement("a");
  a.href = photo.url;
  a.download = photo.filename;
  a.style.display = "none";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  // Remove after a short delay so the download has time to start.
  setTimeout(() => a.remove(), 1000);
}

export interface DownloadAllProgress {
  done: number;
  total: number;
  current: string;
}

// Download every photo by triggering a staggered series of <a download>
// clicks. Staggering avoids the browser treating rapid clicks as popup
// spam and blocking them. Each download uses the user's IP (no CORS, no
// datacenter IP block), so this works reliably in production on Vercel.
export async function downloadAllDirect(
  photos: Photo[],
  onProgress: (p: DownloadAllProgress) => void,
  delayMs = 250
): Promise<void> {
  const total = photos.length;
  let done = 0;
  for (const p of photos) {
    onProgress({ done, total, current: p.filename });
    downloadPhotoDirect(p);
    done += 1;
    onProgress({ done, total, current: p.filename });
    // Stagger clicks so the browser doesn't treat them as popup spam.
    if (done < total) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
