import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // Watermark removal can take 2-5 seconds

interface RemoveWatermarkRequest {
  imageUrl: string;
  region?: WatermarkRegion;
  removeText?: boolean;
}

interface WatermarkRegion {
  position?: "TL" | "T" | "TR" | "L" | "C" | "R" | "BL" | "B" | "BR";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface DewatermarkResponse {
  status: string;
  edited_image: {
    image: string; // base64
  };
  credits_used: number;
}

/**
 * Generate a mask image for the watermark region.
 * Returns a white rectangle on black background (white = area to remove).
 */
async function generateMask(
  imageWidth: number,
  imageHeight: number,
  region?: WatermarkRegion
): Promise<Buffer> {
  // If no region specified, return null (Dewatermark.ai will auto-detect with remove_text)
  if (!region || !region.position) {
    return Buffer.from("");
  }

  // For now, we'll use a simple approach: create a mask based on preset positions
  // Each preset covers roughly 1/3 of the image in that region
  let maskWidth = Math.floor(imageWidth / 3);
  let maskHeight = Math.floor(imageHeight / 4);

  let x = 0;
  let y = 0;

  // Calculate position based on preset
  const positions: Record<string, { x: number; y: number }> = {
    TL: { x: 0, y: 0 },
    T: { x: imageWidth / 2 - maskWidth / 2, y: 0 },
    TR: { x: imageWidth - maskWidth, y: 0 },
    L: { x: 0, y: imageHeight / 2 - maskHeight / 2 },
    C: { x: imageWidth / 2 - maskWidth / 2, y: imageHeight / 2 - maskHeight / 2 },
    R: { x: imageWidth - maskWidth, y: imageHeight / 2 - maskHeight / 2 },
    BL: { x: 0, y: imageHeight - maskHeight },
    B: { x: imageWidth / 2 - maskWidth / 2, y: imageHeight - maskHeight },
    BR: { x: imageWidth - maskWidth, y: imageHeight - maskHeight },
  };

  const pos = positions[region.position];
  if (pos) {
    x = Math.floor(pos.x);
    y = Math.floor(pos.y);
  }

  // Use custom coordinates if provided
  if (region.x !== undefined) x = region.x;
  if (region.y !== undefined) y = region.y;
  if (region.width !== undefined) maskWidth = region.width;
  if (region.height !== undefined) maskHeight = region.height;

  // Create a simple mask using canvas-like approach
  // For production, you might want to use a proper image library like sharp
  // For now, return empty buffer and rely on Dewatermark.ai's remove_text feature
  return Buffer.from("");
}

/**
 * Fetch image from URL with proper headers (similar to proxy route)
 */
async function fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const headers: HeadersInit = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://fotoyu.com/",
  };

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return { buffer, contentType };
}

/**
 * Call Dewatermark.ai API to remove watermark
 */
async function callDewatermarkAPI(
  imageBuffer: Buffer,
  maskBuffer: Buffer,
  removeText: boolean = true
): Promise<DewatermarkResponse> {
  const apiKey = process.env.DEWATERMARK_API_KEY;
  const apiUrl = process.env.DEWATERMARK_API_URL || 
    "https://platform.dewatermark.ai/api/object_removal/v2/erase";

  if (!apiKey) {
    throw new Error("DEWATERMARK_API_KEY not configured");
  }

  // Create form data
  const formData = new FormData();
  formData.append(
    "original_preview_image",
    new Blob([imageBuffer], { type: "image/jpeg" }),
    "image.jpg"
  );

  // Only add mask if we have one
  if (maskBuffer.length > 0) {
    formData.append(
      "mask_brush",
      new Blob([maskBuffer], { type: "image/png" }),
      "mask.png"
    );
  }

  formData.append("remove_text", removeText ? "true" : "false");
  formData.append("predict_mode", "3.0"); // Latest model

  // Call API with retry logic
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
        },
        body: formData,
        signal: AbortSignal.timeout(30000), // 30s timeout per attempt
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dewatermark API error: HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data as DewatermarkResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on auth errors
      if (lastError.message.includes("401") || lastError.message.includes("403")) {
        throw lastError;
      }

      // Retry on network/timeout errors
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to call Dewatermark API after 3 attempts");
}

export async function POST(req: Request) {
  try {
    const body: RemoveWatermarkRequest = await req.json();
    const { imageUrl, region, removeText = true } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    // Validate API key exists
    if (!process.env.DEWATERMARK_API_KEY) {
      return NextResponse.json(
        { 
          error: "Watermark removal not configured. Please set DEWATERMARK_API_KEY.",
          fallback: "original" 
        },
        { status: 503 }
      );
    }

    // Step 1: Fetch the original image
    let imageBuffer: Buffer;
    let contentType: string;
    try {
      const fetched = await fetchImage(imageUrl);
      imageBuffer = fetched.buffer;
      contentType = fetched.contentType;
    } catch (error) {
      return NextResponse.json(
        {
          error: `Failed to fetch image: ${error instanceof Error ? error.message : "Unknown error"}`,
          fallback: "original",
        },
        { status: 502 }
      );
    }

    // Step 2: Generate mask if region is specified
    // For now, we rely on remove_text feature instead of mask
    const maskBuffer = Buffer.from("");

    // Step 3: Call Dewatermark.ai API
    let result: DewatermarkResponse;
    try {
      result = await callDewatermarkAPI(imageBuffer, maskBuffer, removeText);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Watermark removal failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          fallback: "original",
        },
        { status: 502 }
      );
    }

    // Step 4: Return processed image
    if (result.status === "success" && result.edited_image?.image) {
      // Decode base64 image
      const processedImageBuffer = Buffer.from(result.edited_image.image, "base64");

      return new Response(processedImageBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
          "X-Credits-Used": result.credits_used.toString(),
        },
      });
    }

    return NextResponse.json(
      {
        error: "Unexpected response from Dewatermark API",
        fallback: "original",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in remove-watermark route:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
        fallback: "original",
      },
      { status: 500 }
    );
  }
}
