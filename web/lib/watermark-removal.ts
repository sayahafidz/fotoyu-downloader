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

/**
 * Remove watermark from a photo using the Dewatermark.ai API
 */
export async function removeWatermark(
  photo: Photo,
  settings: WatermarkRemovalSettings
): Promise<WatermarkRemovalResult> {
  try {
    const response = await fetch("/api/remove-watermark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: photo.url,
        region: settings.region,
        removeText: settings.removeText || settings.autoDetect,
      }),
      signal: AbortSignal.timeout(45000), // 45s timeout (API takes 2-5s + overhead)
    });

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
    const creditsUsed = parseInt(response.headers.get("X-Credits-Used") || "1", 10);

    // Create object URL for the processed image
    const processedImageUrl = URL.createObjectURL(blob);

    return {
      success: true,
      processedImageUrl,
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

  // Process photos with concurrency limit (max 5 at a time to avoid overwhelming API)
  const concurrency = 5;
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
  removeText: true,
  autoDetect: true,
  region: undefined,
};
