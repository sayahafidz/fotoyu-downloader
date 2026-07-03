// Shared types + parsing logic for the fotoyu API response.
// Used by both the /api/parse route and (optionally) the client.

export interface PhotoResolution {
  width: number;
  height: number;
}

export interface Photo {
  id: string;
  url: string;
  title: string;
  filename: string;
  product_id: string;
  creator_name: string;
  content_type: string;
  resolution: PhotoResolution | null;
  size: number;
}

interface FotoyuItem {
  product_id?: string;
  product_type?: string;
  title?: string;
  url?: string;
  content_type?: string;
  creator_name?: string;
  resolution?: { width?: number; height?: number } | null;
  size?: number;
}

interface FotoyuResponse {
  result?: {
    data?: FotoyuItem[];
  };
}

// Host allowlist for the image proxy. Only these hosts may be fetched
// server-side to prevent the route from becoming an open proxy.
export const ALLOWED_HOSTS = new Set<string>([
  "cfsimgproxy.fototree.com",
  "cfwimgproxy.fototree.com",
  "cdn.fotoyu.com",
]);

export function isAllowedHost(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

// Remove characters that are unsafe on Windows / Unix.
export function sanitizeFilename(name: string): string {
  if (!name) return "";
  let cleaned = name.replace(/\//g, "_").replace(/\\/g, "_");
  cleaned = cleaned.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  cleaned = cleaned.trim().replace(/[.\s]+$/g, "");
  return cleaned;
}

// Build a safe, unique filename for a photo item.
export function buildFilename(
  title: string,
  productId: string,
  url: string,
  used: Set<string>
): string {
  let base = sanitizeFilename(title) || sanitizeFilename(productId) || "image";

  // Ensure there is an extension. Infer from the URL path if missing.
  if (!/\.[a-zA-Z0-9]{2,4}$/.test(base)) {
    const ext = inferExtension(url);
    base = base + ext;
  }

  // Deduplicate: append _2, _3, ... if name already used.
  if (used.has(base)) {
    const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : "";
    let i = 2;
    let candidate = `${stem}_${i}${ext}`;
    while (used.has(candidate)) {
      i += 1;
      candidate = `${stem}_${i}${ext}`;
    }
    base = candidate;
  }

  used.add(base);
  return base;
}

function inferExtension(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "";
    const m = last.match(/\.([a-zA-Z]{3,4})(?:$|\?|#)/);
    if (m) return "." + m[1].toLowerCase();
  } catch {
    // ignore
  }
  return ".jpg";
}

// Extract the list of downloadable photos from a raw fotoyu JSON string.
export function extractPhotos(rawJson: string): Photo[] {
  const data = JSON.parse(rawJson) as FotoyuResponse;
  const items = data?.result?.data;
  if (!Array.isArray(items)) {
    throw new Error("JSON tidak valid: field `result.data` tidak ditemukan.");
  }

  const used = new Set<string>();
  const seenUrls = new Set<string>();
  const photos: Photo[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    if (item.content_type && item.content_type !== "photo") continue;

    const url = item.url;
    if (!url || typeof url !== "string") continue;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const title = item.title ?? "";
    const productId = item.product_id ?? "";
    const filename = buildFilename(title, productId, url, used);

    const res = item.resolution;
    photos.push({
      id: productId || url,
      url,
      title: title || filename,
      filename,
      product_id: productId,
      creator_name: item.creator_name ?? "",
      content_type: item.content_type ?? "photo",
      resolution:
        res && typeof res.width === "number" && typeof res.height === "number"
          ? { width: res.width, height: res.height }
          : null,
      size: item.size ?? 0,
    });
  }

  return photos;
}
