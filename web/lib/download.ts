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

// Download a single photo via the proxy route.
export async function fetchPhotoBlob(photo: Photo): Promise<Blob> {
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(photo.url)}`);
  if (!res.ok) {
    throw new Error(`Gagal mengunduh ${photo.filename} (HTTP ${res.status})`);
  }
  return res.blob();
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
// a single ZIP file generated in the browser.
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
      const blob = await fetchPhotoBlob(p);
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
