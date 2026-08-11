import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RemoveWatermarkRequest {
  imageUrl: string;
  provider?: "gemini" | "openai" | "dewatermark";
  geminiKey?: string;
  geminiBaseUrl?: string;
  openaiKey?: string;
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

/**
 * Fetch image from URL with fallback headers & public proxies
 */
async function fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const headers: HeadersInit = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    Referer: "https://fotoyu.com/",
  };

  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/jpeg";
      return { buffer, contentType };
    }
  } catch {
    // try fallback public proxy
  }

  const publicUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=auto`;
  const response = await fetch(publicUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`Gagal mengambil foto dari URL: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { buffer, contentType };
}

/**
 * Google Gemini 2.0 Flash Watermark Removal (Free Tier / Custom Base URL)
 */
async function callGeminiAPI(
  imageBuffer: Buffer,
  apiKey: string,
  customBaseUrl?: string
): Promise<Buffer> {
  const base64Image = imageBuffer.toString("base64");
  
  let baseUrl = (
    customBaseUrl ||
    process.env.GEMINI_BASE_URL ||
    "https://generativelanguage.googleapis.com"
  ).trim();

  // Strip trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Determine endpoint format
  let endpoint: string;
  const isCustomProxy = baseUrl.includes("/v1") || baseUrl.includes("antigravity");
  
  if (baseUrl.includes("/chat/completions")) {
    endpoint = baseUrl;
  } else if (baseUrl.endsWith("/v1")) {
    endpoint = `${baseUrl}/chat/completions`;
  } else if (baseUrl.includes("/generateContent") || baseUrl.includes(":generateContent")) {
    endpoint = baseUrl.includes("?") ? `${baseUrl}&key=${apiKey}` : `${baseUrl}?key=${apiKey}`;
  } else if (baseUrl.endsWith("/v1beta")) {
    endpoint = `${baseUrl}/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  } else {
    endpoint = `${baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  }

  // If using OpenAI-compatible custom proxy like /v1/chat/completions
  if (endpoint.includes("/chat/completions")) {
    const openaiPayload = {
      model: "gemini-3.6-flash-high",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Detect and completely remove all text watermarks, logos, grid lines, and overlay stamps from this photo. Seamlessly reconstruct and restore the original background textures and colors under the watermarked areas.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(openaiPayload),
      signal: AbortSignal.timeout(40000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Custom OpenAI-compatible Proxy error (HTTP ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    // Check if proxy returns base64 image or markdown image
    if (typeof content === "string") {
      const b64Match = content.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
      if (b64Match) {
        return Buffer.from(b64Match[1], "base64");
      }
    }
    
    // Fallback: check if returned direct image structure
    const inlineData = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
    const resultBase64 = inlineData?.inlineData?.data || inlineData?.inline_data?.data;
    if (resultBase64) {
      return Buffer.from(resultBase64, "base64");
    }

    throw new Error("Custom Proxy mengembalikan response text/chat biasa, bukan gambar ter-edit.");
  }

  const payload = {
    contents: [
      {
        parts: [
          {
            text: "Detect and completely remove all text watermarks, logos, grid lines, and overlay stamps from this photo. Seamlessly reconstruct and restore the original background textures and colors under the watermarked areas. Return ONLY the clean output image without any surrounding text or markdown explanations.",
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "image/jpeg",
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["x-goog-api-key"] = apiKey;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(40000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (HTTP ${response.status}): ${errText}`);
  }

  const data = await response.json();
  const inlineData = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
  const resultBase64 = inlineData?.inlineData?.data || inlineData?.inline_data?.data;

  if (!resultBase64) {
    // If Gemini returns text instead of image or refuses inline_data, fallback error
    const textPart = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
    throw new Error(textPart || "Gemini API tidak mengembalikan format gambar yang valid.");
  }

  return Buffer.from(resultBase64, "base64");
}

/**
 * OpenAI Vision Watermark Removal
 */
async function callOpenAIAPI(imageBuffer: Buffer, apiKey: string): Promise<Buffer> {
  const base64Image = imageBuffer.toString("base64");
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Remove all watermarks and text overlays from this photo, restoring the original details beneath seamlessly." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 1000
    }),
    signal: AbortSignal.timeout(40000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (HTTP ${response.status}): ${errText}`);
  }

  const data = await response.json();
  throw new Error("OpenAI Chat Completion API mengembalikan teks deskripsi, gunakan Gemini 2.0 Flash untuk direct image output.");
}

/**
 * Dewatermark.ai API
 */
async function callDewatermarkAPI(imageBuffer: Buffer, apiKey: string): Promise<Buffer> {
  const formData = new FormData();
  formData.append(
    "original_preview_image",
    new Blob([imageBuffer], { type: "image/jpeg" }),
    "image.jpg"
  );
  formData.append("remove_text", "true");
  formData.append("predict_mode", "3.0");

  const response = await fetch("https://platform.dewatermark.ai/api/object_removal/v2/erase", {
    method: "POST",
    headers: { "X-API-KEY": apiKey },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dewatermark API error: HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data?.status === "success" && data?.edited_image?.image) {
    return Buffer.from(data.edited_image.image, "base64");
  }
  throw new Error("Dewatermark API gagal memproses foto.");
}

export async function POST(req: Request) {
  try {
    const body: RemoveWatermarkRequest = await req.json();
    const { imageUrl, provider = "gemini", geminiKey, geminiBaseUrl, openaiKey } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Parameter imageUrl wajib diisi." }, { status: 400 });
    }

    // Step 1: Resolve API key & provider & base url
    const effectiveGeminiKey = process.env.GEMINI_API_KEY || geminiKey || req.headers.get("x-gemini-key") || "";
    const effectiveGeminiBaseUrl = process.env.GEMINI_BASE_URL || geminiBaseUrl || req.headers.get("x-gemini-base-url") || "";
    const effectiveOpenAIKey = process.env.OPENAI_API_KEY || openaiKey || req.headers.get("x-openai-key") || "";
    const effectiveDewatermarkKey = process.env.DEWATERMARK_API_KEY || "";

    // Step 2: Fetch original image
    let imageBuffer: Buffer;
    let contentType: string;
    try {
      const fetched = await fetchImage(imageUrl);
      imageBuffer = fetched.buffer;
      contentType = fetched.contentType;
    } catch (e: any) {
      return NextResponse.json(
        { error: `Gagal memuat foto asli: ${e.message}`, fallback: "original" },
        { status: 502 }
      );
    }

    // Step 3: Process via selected AI Provider
    let processedBuffer: Buffer | null = null;
    let usedProvider = provider;

    if (provider === "gemini" || (!effectiveDewatermarkKey && effectiveGeminiKey)) {
      if (!effectiveGeminiKey && !effectiveGeminiBaseUrl) {
        return NextResponse.json(
          {
            error: "Gemini API Key / Base URL belum dikonfigurasi. Masukkan Secret Key / API Key Anda pada opsi Watermark Settings.",
            fallback: "original",
          },
          { status: 400 }
        );
      }
      processedBuffer = await callGeminiAPI(imageBuffer, effectiveGeminiKey, effectiveGeminiBaseUrl);
      usedProvider = "gemini";
    } else if (provider === "openai") {
      if (!effectiveOpenAIKey) {
        return NextResponse.json(
          { error: "OpenAI API Key tidak ditemukan.", fallback: "original" },
          { status: 400 }
        );
      }
      processedBuffer = await callOpenAIAPI(imageBuffer, effectiveOpenAIKey);
      usedProvider = "openai";
    } else if (provider === "dewatermark") {
      if (!effectiveDewatermarkKey) {
        return NextResponse.json(
          { error: "DEWATERMARK_API_KEY server belum di-set.", fallback: "original" },
          { status: 503 }
        );
      }
      processedBuffer = await callDewatermarkAPI(imageBuffer, effectiveDewatermarkKey);
      usedProvider = "dewatermark";
    }

    if (processedBuffer) {
      return new Response(processedBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType || "image/jpeg",
          "Cache-Control": "public, max-age=86400",
          "X-AI-Provider": usedProvider,
        },
      });
    }

    return NextResponse.json(
      { error: "Tidak dapat memproses foto dengan AI provider saat ini.", fallback: "original" },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: `Gagal menghapus watermark: ${error?.message || "Unknown error"}`,
        fallback: "original",
      },
      { status: 500 }
    );
  }
}
