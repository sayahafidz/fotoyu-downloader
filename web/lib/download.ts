// Browser-side helpers for triggering downloads and building a ZIP
// from proxied image blobs.

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

// Download a single photo via the proxy route. Used by the ZIP flow where
// we need the raw image bytes (Blob) for JSZip. Falls back to the direct
// CDN URL as a last resort (works only if the CDN sends CORS headers).
export async function fetchPhotoBlobViaProxy(photo: Photo): Promise<Blob> {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(photo.url)}`;
  const res = await fetch(proxyUrl);
  if (res.ok) {
    return res.blob();
  }

  // Proxy failed (typically 502 with "Upstream mengembalikan HTTP 403").
  // Try the direct CDN URL — this usually fails with CORS but might work
  // if the CDN sends Access-Control-Allow-Origin.
  try {
    const direct = await fetch(photo.url, { mode: "cors" });
    if (direct.ok) {
      return direct.blob();
    }
    throw new Error(`HTTP ${direct.status}`);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    throw new Error(
      `Gagal mengunduh ${photo.filename} (proxy HTTP ${res.status}; direct ${reason}). ` +
        `Coba download per foto via tombol Download, atau gunakan script Python.`
    );
  }
}

// Run async tasks with a concurrency limit.
async function withConcurrency<T>(
  limit: number,
  tasks: Array<() => Promise<T>>
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  let active = 0;

  return new Promise((resolve, reject) => {
    const launch = () => {
      while (active < limit && cursor < tasks.length) {
        const idx = cursor;
        cursor += 1;
        active += 1;
        tasks[idx]()
          .then((v) => {
            results[idx] = v;
          })
          .catch(reject)
          .finally(() => {
            active -= 1;
            if (cursor >= tasks.length && active === 0) resolve(results);
            else launch();
          });
      }
    };
    launch();
  });
}

export interface ZipProgress {
  done: number;
  total: number;
  current: string;
}

// Fetch all photos concurrently through the proxy and pack them into
// a single ZIP file generated in the browser. If the proxy is blocked,
// each individual download falls back to the direct CDN URL.
export async function downloadAllAsZip(
  photos: Photo[],
  onProgress: (p: ZipProgress) => void,
  concurrency = 6
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  let done = 0;

  await withConcurrency(
    concurrency,
    photos.map((p) => async () => {
      const blob = await fetchPhotoBlobViaProxy(p);
      zip.file(p.filename, blob);
      done += 1;
      onProgress({ done, total: photos.length, current: p.filename });
    })
  );

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(zipBlob, `fotoyu-photos-${stamp}.zip`);
}
