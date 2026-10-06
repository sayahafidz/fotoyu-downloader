import { NextResponse } from "next/server";
import { isAllowedHost } from "@/lib/parse";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
    const response = await fetch(url, { headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
        await response.body?.cancel();
        throw new Error("CDN tidak mengembalikan gambar.");
      }
      // Bound memory in a serverless invocation, including base64 expansion.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("File foto kosong.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 20 * 1024 * 1024) throw new Error("Foto terlalu besar untuk pemrosesan (maksimum 20 MB).");
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      const buffer = Buffer.concat(chunks);
      if (!buffer.length) throw new Error("File foto kosong.");
      return { buffer, contentType };
    }
    await response.body?.cancel();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Gagal mengambil foto dari URL.");
  }

  throw new Error("Gagal mengambil foto dari URL.");
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
      model: process.env.GEMINI_MODEL?.trim() || "hfz/gemini-3.1-flash-image",
      stream: false,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Remove all text, watermarks, captions, and any faint color artifacts such as rainbow-colored streaks, light leaks, lens flare lines, or color banding from this photo, then fill the cleared areas with natural textures that blend seamlessly with the surroundings, leaving no trace or artifacts. Professionally enhance the photo quality by improving sharpness and detail, correcting color balance for a natural look, adjusting lighting subtly, and reducing noise or grain where present. Perform natural retouching on minor skin blemishes, with strict constraints: do not alter facial structure including the nose, eyes, lips, or jaw; do not change body proportions such as posture, size, or shape; do not modify identifying features so the person remains recognizable; and preserve the original facial expression. Maintain the original background composition and elements, only subtly improving clarity without adding or removing anything except the unwanted artifacts mentioned above. The final result must be photorealistic, appearing like a professional photograph rather than an edited image, with the original composition and framing fully intact — with no visible trace of the removed rainbow line or any other artifact. Return ONLY the clean output image without any surrounding text or markdown explanations.",
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
      const detail = await response.json().catch(() => null);
      console.error("[remove-watermark] router request failed", {
        status: response.status,
        model: openaiPayload.model,
        endpoint: new URL(endpoint).origin + new URL(endpoint).pathname,
      });
      const reason = typeof detail?.error?.message === "string" ? detail.error.message.slice(0, 300) : "Respons router tidak valid.";
      throw new Error(`Router gagal (HTTP ${response.status}): ${reason}`);
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
            text: "Remove all text, watermarks, captions, and any faint color artifacts such as rainbow-colored streaks, light leaks, lens flare lines, or color banding from this photo, then fill the cleared areas with natural textures that blend seamlessly with the surroundings, leaving no trace or artifacts. Professionally enhance the photo quality by improving sharpness and detail, correcting color balance for a natural look, adjusting lighting subtly, and reducing noise or grain where present. Perform natural retouching on minor skin blemishes, with strict constraints: do not alter facial structure including the nose, eyes, lips, or jaw; do not change body proportions such as posture, size, or shape; do not modify identifying features so the person remains recognizable; and preserve the original facial expression. Maintain the original background composition and elements, only subtly improving clarity without adding or removing anything except the unwanted artifacts mentioned above. The final result must be photorealistic, appearing like a professional photograph rather than an edited image, with the original composition and framing fully intact — with no visible trace of the removed rainbow line or any other artifact. Return ONLY the clean output image without any surrounding text or markdown explanations.",
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
    new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }),
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
    // Do not echo upstream responses: they may contain account information.
    if (response.status === 429) {
      throw new DewatermarkError("Dewatermark membatasi permintaan. Coba lagi nanti.", 429);
    }
    if (response.status === 402) {
      throw new DewatermarkError("Kredit Dewatermark habis.", 402);
    }
    if (response.status === 401 || response.status === 403) {
      throw new DewatermarkError("API key Dewatermark ditolak. Periksa akses API akun.", 502);
    }
    throw new DewatermarkError(`Dewatermark gagal (HTTP ${response.status}).`, 502);
  }

  const data = await response.json();
  const image = data?.edited_image?.image;
  if (typeof image === "string" && image.length > 0 && data?.status === "success") {
    const encoded = image.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, "");
    return Buffer.from(encoded, "base64");
  }
  throw new DewatermarkError("Respons gambar Dewatermark tidak dikenali. Periksa format API akun Anda.", 502);
}

class DewatermarkError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function POST(req: Request) {
  let body: RemoveWatermarkRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus berupa JSON valid." }, { status: 400 });
  }
  try {
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    const { imageUrl, provider = "gemini", geminiKey, geminiBaseUrl, openaiKey } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "Parameter imageUrl wajib diisi." }, { status: 400 });
    }
    if (!isAllowedHost(imageUrl)) return NextResponse.json({ error: "Host foto tidak diizinkan." }, { status: 403 });

    if (provider !== "gemini" && provider !== "openai" && provider !== "dewatermark") {
      return NextResponse.json({ error: "Provider tidak dikenal." }, { status: 400 });
    }

    // Step 1: Resolve API key & provider & base url
    const effectiveGeminiKey = process.env.GEMINI_API_KEY || geminiKey || req.headers.get("x-gemini-key") || "";
    const effectiveGeminiBaseUrl = process.env.GEMINI_BASE_URL || geminiBaseUrl || req.headers.get("x-gemini-base-url") || "";
    const effectiveOpenAIKey = process.env.OPENAI_API_KEY || openaiKey || req.headers.get("x-openai-key") || "";
    const effectiveDewatermarkKey = process.env.DEWATERMARK_API_KEY || "";
    if (effectiveGeminiBaseUrl) {
      let base: URL;
      try { base = new URL(effectiveGeminiBaseUrl); } catch { return NextResponse.json({ error: "Base URL Gemini tidak valid." }, { status: 400 }); }
      if (base.protocol !== "https:" || base.username || base.password) return NextResponse.json({ error: "Base URL Gemini harus HTTPS tanpa kredensial URL." }, { status: 400 });
      // User-selected endpoints cannot receive a server-owned credential.
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_BASE_URL && base.hostname !== "generativelanguage.googleapis.com") return NextResponse.json({ error: "Base URL custom dengan key server harus diatur melalui GEMINI_BASE_URL." }, { status: 400 });
    }
    if (provider === "gemini" && !effectiveGeminiKey && !effectiveGeminiBaseUrl) return NextResponse.json({ error: "Gemini belum dikonfigurasi.", fallback: "original" }, { status: 503 });
    if (provider === "openai") return NextResponse.json({ error: "Provider OpenAI Chat yang dikonfigurasi tidak mendukung output gambar edit. Pilih Gemini image-capable atau Dewatermark.", fallback: "original" }, { status: 422 });

    // Fail before fetching an image or contacting any provider.
    if (provider === "dewatermark" && !effectiveDewatermarkKey) {
      return NextResponse.json(
        { error: "DEWATERMARK_API_KEY server belum di-set.", fallback: "original" },
        { status: 503 }
      );
    }

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

    if (provider === "gemini") {
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
    } else if (provider === "dewatermark") {
      processedBuffer = await callDewatermarkAPI(imageBuffer, effectiveDewatermarkKey);
      usedProvider = "dewatermark";
    }

    if (processedBuffer) {
      return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(processedBuffer!)); controller.close(); } }), {
        status: 200,
        headers: {
          "Content-Type": usedProvider === "dewatermark" && processedBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? "image/png"
            : usedProvider === "dewatermark" ? "image/jpeg" : contentType || "image/jpeg",
          "Cache-Control": "private, no-store",
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
      { status: error instanceof DewatermarkError ? error.status : 500 }
    );
  }
}
