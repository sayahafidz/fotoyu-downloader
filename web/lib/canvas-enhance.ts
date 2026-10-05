/**
 * Client-Side In-Browser Photo Enhancer & Artifact Healer
 * Works 100% offline in browser without any external API or keys!
 */

export interface EnhanceOptions {
  autoTone?: boolean;          // Auto-contrast & dynamic range expansion
  vibrance?: number;          // Color pop (0 to 50, default 15)
  sharpness?: number;         // Detail enhancement (0 to 30, default 10)
  healRainbowStreaks?: boolean; // Smooth faint rainbow watermark streaks
  brightness?: number;        // -20 to +20, default 0
  contrast?: number;          // -20 to +30, default 5
}

export const DEFAULT_ENHANCE_OPTIONS: EnhanceOptions = {
  autoTone: true,
  vibrance: 18,
  sharpness: 12,
  healRainbowStreaks: true,
  brightness: 2,
  contrast: 8,
};

/**
 * Loads an image from a URL or Blob into an HTMLImageElement safely
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Enhances an image blob or URL using Client-Side HTML5 Canvas Pixel Pipeline
 */
export async function enhanceImageCanvas(
  source: string | Blob,
  options: EnhanceOptions = DEFAULT_ENHANCE_OPTIONS
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  let objectUrlToRevoke: string | null = null;
  let srcUrl: string;

  if (source instanceof Blob) {
    srcUrl = URL.createObjectURL(source);
    objectUrlToRevoke = srcUrl;
  } else {
    srcUrl = source;
  }

  try {
    const img = await loadImageElement(srcUrl);
    const canvas = document.createElement("canvas");
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // Draw base image
    ctx.drawImage(img, 0, 0, width, height);

    // Apply color adjustments via CSS canvas filter where supported for high speed
    const contrastVal = 100 + (options.contrast || 0);
    const brightnessVal = 100 + (options.brightness || 0);
    const saturateVal = 100 + (options.vibrance || 0);

    if (contrastVal !== 100 || brightnessVal !== 100 || saturateVal !== 100) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.filter = `contrast(${contrastVal}%) brightness(${brightnessVal}%) saturate(${saturateVal}%)`;
        tempCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    // Advanced Pixel Processing (Auto-Tone & Rainbow Streak Healer)
    if (options.autoTone || options.healRainbowStreaks || (options.sharpness && options.sharpness > 0)) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // 1. Auto-Tone (Histogram stretch)
      if (options.autoTone) {
        let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
        const step = Math.max(1, Math.floor(data.length / 40000)); // sample ~10k pixels for instant speed
        for (let i = 0; i < data.length; i += 4 * step) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (g < minG) minG = g;
          if (g > maxG) maxG = g;
          if (b < minB) minB = b;
          if (b > maxB) maxB = b;
        }

        // Soft clamp bounds to prevent blown out highlights
        minR = Math.min(minR, 30);
        maxR = Math.max(maxR, 225);
        minG = Math.min(minG, 30);
        maxG = Math.max(maxG, 225);
        minB = Math.min(minB, 30);
        maxB = Math.max(maxB, 225);

        const rangeR = maxR - minR || 1;
        const rangeG = maxG - minG || 1;
        const rangeB = maxB - minB || 1;

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, ((data[i] - minR) * 255) / rangeR));
          data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - minG) * 255) / rangeG));
          data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - minB) * 255) / rangeB));
        }
      }

      // 2. Rainbow Streak / Color Banding Healer
      if (options.healRainbowStreaks) {
        // Soft chromatic aberration suppression on high-frequency chroma anomalies
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;

          // If pixel has unnatural rainbow saturation spikes compared to luminance
          const maxChannel = Math.max(r, g, b);
          const minChannel = Math.min(r, g, b);
          const chroma = maxChannel - minChannel;

          if (chroma > 75 && luma > 40 && luma < 220) {
            // Blend chroma towards local neutral luminance
            const blendRatio = 0.15;
            data[i] = r * (1 - blendRatio) + luma * blendRatio;
            data[i + 1] = g * (1 - blendRatio) + luma * blendRatio;
            data[i + 2] = b * (1 - blendRatio) + luma * blendRatio;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // 3. Unsharp Mask Sharpness Boost (Canvas convolution)
      if (options.sharpness && options.sharpness > 0) {
        const amount = (options.sharpness / 100) * 0.4;
        ctx.globalAlpha = amount;
        ctx.drawImage(canvas, -1, 0, width, height);
        ctx.drawImage(canvas, 1, 0, width, height);
        ctx.drawImage(canvas, 0, -1, width, height);
        ctx.drawImage(canvas, 0, 1, width, height);
        ctx.globalAlpha = 1.0;
      }
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Gagal membuat blob dari canvas"));
        },
        "image/jpeg",
        0.95
      );
    });

    return { blob, dataUrl, width, height };
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}
