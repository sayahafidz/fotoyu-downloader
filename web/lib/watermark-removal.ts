import type { Photo } from "./parse";

export interface WatermarkRegion {
  position?: "TL" | "T" | "TR" | "L" | "C" | "R" | "BL" | "B" | "BR";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface WatermarkRemovalSettings {
  enabled: boolean;
  provider?: "gemini" | "openai" | "dewatermark";
  geminiKey?: string;
  geminiBaseUrl?: string;
  openaiKey?: string;
  region?: WatermarkRegion;
  removeText: boolean;
  autoDetect: boolean;
}

export interface WatermarkRemovalResult {
  success: boolean;
  processedImageUrl?: string;
  processedImageBlob?: Blob;
  creditsUsed?: number;
  error?: string;
  fallback?: "original" | "client-side";
}

// Share one queue across single-photo and batch downloads, including the
// parallel workers in download.ts. A failure must not block later jobs.
let dewatermarkQueue: Promise<unknown> = Promise.resolve();
function stored(key: string): string {
  try { return typeof window !== "undefined" ? localStorage.getItem(key) || "" : ""; } catch { return ""; }
}

function queueDewatermark<T>(work: () => Promise<T>): Promise<T> {
  const job = dewatermarkQueue.then(work, work);
  dewatermarkQueue = job.catch(() => undefined);
  return job;
}

/** Remove watermark through the selected server-side provider. */
export async function removeWatermark(
  photo: Photo,
  settings: WatermarkRemovalSettings,
  signal?: AbortSignal
): Promise<WatermarkRemovalResult> {
  try {
    const savedGeminiKey =
      settings.geminiKey ||
      stored("fotoyu_gemini_key");
    const savedGeminiBaseUrl =
      settings.geminiBaseUrl ||
      stored("fotoyu_gemini_base_url");
    const savedOpenAIKey =
      settings.openaiKey ||
      stored("fotoyu_openai_key");

    const sendRequest = () => {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return fetch("/api/remove-watermark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(savedGeminiKey ? { "X-Gemini-Key": savedGeminiKey } : {}),
        ...(savedGeminiBaseUrl ? { "X-Gemini-Base-Url": savedGeminiBaseUrl } : {}),
        ...(savedOpenAIKey ? { "X-OpenAI-Key": savedOpenAIKey } : {}),
      },
      body: JSON.stringify({
        imageUrl: photo.url,
        provider: settings.provider || "gemini",
        geminiKey: savedGeminiKey,
        geminiBaseUrl: savedGeminiBaseUrl,
        openaiKey: savedOpenAIKey,
        region: settings.region,
        removeText: settings.removeText || settings.autoDetect,
      }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(55000)]) : AbortSignal.timeout(55000),
    });
    };
    const response = settings.provider === "dewatermark"
      ? await queueDewatermark(sendRequest)
      : await sendRequest();

    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
          fallback: errorData.fallback || "original",
        };
      } catch {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          fallback: "original",
        };
      }
    }

    // Get processed image as blob
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith("image/")) return { success: false, error: "Provider tidak mengembalikan file gambar valid.", fallback: "original" };
    const creditsUsed = parseInt(response.headers.get("X-Credits-Used") || "1", 10);

    // Create object URL for the processed image

    return {
      success: true,
      processedImageBlob: blob,
      creditsUsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: "original",
    };
  }
}

/**
 * Remove watermarks from multiple photos with retry logic
 */
export async function removeWatermarkBatch(
  photos: Photo[],
  settings: WatermarkRemovalSettings,
  onProgress?: (progress: {
    done: number;
    total: number;
    current: string;
    success: number;
    failed: number;
  }) => void
): Promise<Map<string, WatermarkRemovalResult>> {
  const results = new Map<string, WatermarkRemovalResult>();
  const total = photos.length;
  let done = 0;
  let success = 0;
  let failed = 0;

  // Keep DeWatermark jobs serial to respect its published fair-use guidance.
  const concurrency = settings.provider === "dewatermark" ? 1 : 5;
  const queue = [...photos];
  const processing: Promise<void>[] = [];

  const processOne = async () => {
    while (queue.length > 0) {
      const photo = queue.shift();
      if (!photo) break;

      onProgress?.({
        done,
        total,
        current: photo.filename,
        success,
        failed,
      });

      const result = await removeWatermark(photo, settings);
      results.set(photo.product_id, result);

      if (result.success) {
        success += 1;
      } else {
        failed += 1;
      }
      done += 1;

      onProgress?.({
        done,
        total,
        current: photo.filename,
        success,
        failed,
      });
    }
  };

  // Start concurrent processors
  for (let i = 0; i < Math.min(concurrency, photos.length); i++) {
    processing.push(processOne());
  }

  // Wait for all to complete
  await Promise.all(processing);

  return results;
}

/**
 * Estimate cost for watermark removal (based on Dewatermark.ai pricing)
 */
export function estimateCost(photoCount: number): {
  credits: number;
  costUSD: number;
  costIDR: number;
  perImageUSD: number;
} {
  const credits = photoCount; // 1 credit per image (assuming remove_text=true uses 1 credit)
  
  // Pricing tiers (from plan)
  let perImageUSD: number;
  if (credits <= 100) {
    perImageUSD = 0.07; // Entry tier
  } else if (credits <= 1000) {
    perImageUSD = 0.025; // 1K tier
  } else if (credits <= 10000) {
    perImageUSD = 0.01; // 10K tier
  } else {
    perImageUSD = 0.006; // 100K+ tier
  }

  const costUSD = credits * perImageUSD;
  const costIDR = costUSD * 16000; // Rough conversion at Rp 16,000/$

  return {
    credits,
    costUSD,
    costIDR,
    perImageUSD,
  };
}

/**
 * Format cost for display
 */
export function formatCost(costUSD: number, costIDR: number): string {
  if (costUSD < 0.01) {
    return `~$${costUSD.toFixed(3)} (Rp ${Math.round(costIDR)})`;
  }
  return `$${costUSD.toFixed(2)} (Rp ${Math.round(costIDR).toLocaleString()})`;
}

/**
 * Get preset region display name
 */
export function getRegionDisplayName(position?: string): string {
  const names: Record<string, string> = {
    TL: "Kiri Atas",
    T: "Atas Tengah",
    TR: "Kanan Atas",
    L: "Kiri Tengah",
    C: "Tengah",
    R: "Kanan Tengah",
    BL: "Kiri Bawah",
    B: "Bawah Tengah",
    BR: "Kanan Bawah",
  };
  return names[position || ""] || "Auto-detect";
}

/**
 * Default watermark removal settings
 */
export const DEFAULT_WATERMARK_SETTINGS: WatermarkRemovalSettings = {
  enabled: false,
  provider: "gemini",
  geminiKey: "",
  geminiBaseUrl: "",
  openaiKey: "",
  removeText: true,
  autoDetect: true,
  region: undefined,
};
