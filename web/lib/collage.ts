/**
 * Story & Finisher Collage Studio Engine
 * Client-side HTML5 Canvas rendering for high-resolution Instagram Story,
 * Feed (4:5), Square (1:1), and Multi-Photo Finisher Cards.
 */

import type { Photo } from "./parse";
import { loadImageElement } from "./canvas-enhance";

export type CollageRatio = "story" | "portrait" | "square"; // 9:16, 4:5, 1:1
export type CollageTheme = "dark" | "gradient" | "glass" | "minimal";

export interface CollageBadgeConfig {
  title: string;          // e.g. "RACE FINISHER", "MARATHON 2026", "FOTOYU MOMENT"
  subtitle?: string;       // e.g. "Personal Best · Pace 5:12", "Finish Line Glory"
  eventDate?: string;      // e.g. "10 OKT 2026"
  showPhotographer: boolean;
  theme: CollageTheme;
}

export interface CollageDimensions {
  width: number;
  height: number;
}

export const RATIO_DIMENSIONS: Record<CollageRatio, CollageDimensions> = {
  story: { width: 1080, height: 1920 },     // 9:16 (Instagram & WhatsApp Story)
  portrait: { width: 1080, height: 1350 },  // 4:5 (Instagram Feed)
  square: { width: 1080, height: 1080 },    // 1:1 (Square Grid)
};

/**
 * Draw a rounded rectangle with fill and optional stroke
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth = 1
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Draw an image inside a bounding box with object-fit: cover and rounded corners
 */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 16
) {
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const imgRatio = imgW / imgH;
  const boxRatio = w / h;

  let renderW = w;
  let renderH = h;
  let renderX = x;
  let renderY = y;

  if (imgRatio > boxRatio) {
    renderW = h * imgRatio;
    renderX = x - (renderW - w) / 2;
  } else {
    renderH = w / imgRatio;
    renderY = y - (renderH - h) / 2;
  }

  ctx.drawImage(img, renderX, renderY, renderW, renderH);
  ctx.restore();

  // Subtle border overlay for sleek card look
  drawRoundedRect(ctx, x, y, w, h, radius, undefined, "rgba(255, 255, 255, 0.15)", 2);
}

/**
 * Generate a complete collage canvas from selected photos and configuration
 */
export async function generateCollageCanvas(
  photos: Photo[],
  ratio: CollageRatio = "story",
  badgeConfig: CollageBadgeConfig
): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = RATIO_DIMENSIONS[ratio];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context unavailable");

  // Load all images via proxy concurrently
  const loadedImages = await Promise.all(
    photos.map((p) =>
      loadImageElement(`/api/proxy?url=${encodeURIComponent(p.url)}`).catch(() => null)
    )
  );
  const validImages = loadedImages.filter((img): img is HTMLImageElement => img !== null);

  if (validImages.length === 0) {
    throw new Error("Gagal memuat foto untuk kolase.");
  }

  // 1. Draw Background
  if (badgeConfig.theme === "gradient") {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e1b4b");
    grad.addColorStop(1, "#311042");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (badgeConfig.theme === "glass") {
    // Blurred ambient backdrop of the first photo
    ctx.drawImage(validImages[0], 0, 0, W, H);
    ctx.fillStyle = "rgba(10, 15, 30, 0.82)";
    ctx.fillRect(0, 0, W, H);
  } else if (badgeConfig.theme === "minimal") {
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, W, H);
  } else {
    // Dark theme
    ctx.fillStyle = "#0b0f19";
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createRadialGradient(W / 2, H / 3, 50, W / 2, H / 2, W);
    grad.addColorStop(0, "rgba(79, 70, 229, 0.18)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Header / Badge Area Layout
  const topHeaderH = ratio === "story" ? 220 : 160;
  const bottomFooterH = ratio === "story" ? 180 : 120;
  const padding = 36;
  const contentY = topHeaderH;
  const contentH = H - topHeaderH - bottomFooterH;
  const contentW = W - padding * 2;
  const contentX = padding;

  // Draw Top Event Header / Finisher Badge
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";

  // Pill badge background
  const badgeText = badgeConfig.title.toUpperCase();
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  const textWidth = ctx.measureText(badgeText).width;
  const badgePillW = textWidth + 48;
  const badgePillH = 44;
  const badgePillX = (W - badgePillW) / 2;
  const badgePillY = ratio === "story" ? 80 : 40;

  drawRoundedRect(
    ctx,
    badgePillX,
    badgePillY,
    badgePillW,
    badgePillH,
    22,
    "rgba(99, 102, 241, 0.25)",
    "rgba(129, 140, 248, 0.6)",
    2
  );

  ctx.fillStyle = "#a5b4fc";
  ctx.fillText(badgeText, W / 2, badgePillY + 30);

  if (badgeConfig.subtitle) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(badgeConfig.subtitle, W / 2, badgePillY + badgePillH + 34);
  }

  // 3. Dynamic Photo Grid Layout
  const count = validImages.length;
  const gap = 16;
  const cardRadius = 20;

  if (count === 1) {
    // 1 Full Hero Photo
    drawCoverImage(ctx, validImages[0], contentX, contentY, contentW, contentH, cardRadius);
  } else if (count === 2) {
    // 2 Photos: Side-by-Side on wide/square, or Stacked Top-Bottom on story
    if (ratio === "story") {
      const slotH = (contentH - gap) / 2;
      drawCoverImage(ctx, validImages[0], contentX, contentY, contentW, slotH, cardRadius);
      drawCoverImage(ctx, validImages[1], contentX, contentY + slotH + gap, contentW, slotH, cardRadius);
    } else {
      const slotW = (contentW - gap) / 2;
      drawCoverImage(ctx, validImages[0], contentX, contentY, slotW, contentH, cardRadius);
      drawCoverImage(ctx, validImages[1], contentX + slotW + gap, contentY, slotW, contentH, cardRadius);
    }
  } else if (count === 3) {
    // 3 Photos: 1 Main Top Hero + 2 Bottom Thumbnails
    const topH = contentH * 0.58;
    const botH = contentH - topH - gap;
    const botW = (contentW - gap) / 2;

    drawCoverImage(ctx, validImages[0], contentX, contentY, contentW, topH, cardRadius);
    drawCoverImage(ctx, validImages[1], contentX, contentY + topH + gap, botW, botH, cardRadius);
    drawCoverImage(ctx, validImages[2], contentX + botW + gap, contentY + topH + gap, botW, botH, cardRadius);
  } else if (count === 4) {
    // 4 Photos: 2x2 Grid
    const slotW = (contentW - gap) / 2;
    const slotH = (contentH - gap) / 2;

    drawCoverImage(ctx, validImages[0], contentX, contentY, slotW, slotH, cardRadius);
    drawCoverImage(ctx, validImages[1], contentX + slotW + gap, contentY, slotW, slotH, cardRadius);
    drawCoverImage(ctx, validImages[2], contentX, contentY + slotH + gap, slotW, slotH, cardRadius);
    drawCoverImage(ctx, validImages[3], contentX + slotW + gap, contentY + slotH + gap, slotW, slotH, cardRadius);
  } else if (count <= 6) {
    // 6 Photos: 2x3 Grid
    const cols = 2;
    const rows = 3;
    const slotW = (contentW - gap) / cols;
    const slotH = (contentH - gap * 2) / rows;

    for (let i = 0; i < Math.min(6, count); i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = contentX + c * (slotW + gap);
      const y = contentY + r * (slotH + gap);
      drawCoverImage(ctx, validImages[i], x, y, slotW, slotH, 16);
    }
  } else {
    // 9 Photos: 3x3 Mosaic Grid
    const cols = 3;
    const rows = 3;
    const slotW = (contentW - gap * 2) / cols;
    const slotH = (contentH - gap * 2) / rows;

    for (let i = 0; i < Math.min(9, count); i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = contentX + c * (slotW + gap);
      const y = contentY + r * (slotH + gap);
      drawCoverImage(ctx, validImages[i], x, y, slotW, slotH, 14);
    }
  }

  // 4. Bottom Footer & Watermark Attribution
  ctx.textAlign = "center";
  const footerY = H - (ratio === "story" ? 100 : 60);

  // Logo / Branding Tag
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText("⚡ FOTOYU DOWNLOADER", W / 2, footerY);

  if (badgeConfig.showPhotographer) {
    const creators = Array.from(new Set(photos.map((p) => p.creator_name).filter(Boolean)));
    const creatorText = creators.length > 0 ? `Captured by ${creators.slice(0, 2).join(", ")}` : "";
    if (creatorText) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(creatorText, W / 2, footerY + 28);
    }
  }

  return canvas;
}

/**
 * Export canvas as Blob (PNG/JPEG)
 */
export function exportCanvasBlob(
  canvas: HTMLCanvasElement,
  format: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal membuat blob kolase"));
      },
      format,
      quality
    );
  });
}
