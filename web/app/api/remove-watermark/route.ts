import { isAllowedHost } from "@/lib/parse";
import { abuseResponse, checkSameOrigin, rateLimit, reserveWatermark, watermarkQuota } from "@/lib/abuse";
import { boundedBytes, editWithOpenAI, imageType, providerEndpoint, providerImage } from "@/lib/image-provider";
import { readJsonBody } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMPT = "Remove text overlays, watermarks, and color streak artifacts. Restore covered areas naturally. Preserve facial structure, identity, body proportions, expression, original composition, and background. Return only an edited image.";

async function originalImage(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*", Referer: "https://fotoyu.com/" },
    signal, redirect: "error", cache: "no-store",
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Foto asli gagal dimuat (HTTP ${response.status}).`); }
  const bytes = await boundedBytes(response, 20 * 1024 * 1024);
  return { bytes, type: imageType(bytes) };
}

async function geminiImage(bytes: Buffer, type: string, signal: AbortSignal) {
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Base URL Gemini tidak valid.");
  const chat = url.pathname.endsWith("/v1") || url.pathname.endsWith("/chat/completions");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-image";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let endpoint: string;
  let payload: unknown;
  if (chat) {
    endpoint = providerEndpoint(base, "chat");
    if (process.env.GEMINI_API_KEY) headers.Authorization = `Bearer ${process.env.GEMINI_API_KEY}`;
    payload = { model, stream: false, messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: `data:${type};base64,${bytes.toString("base64")}` } }] }] };
  } else {
    const root = base.replace(/\/+$/, "");
    endpoint = root.includes(":generateContent") ? root : `${root}${root.endsWith("/v1beta") ? "" : "/v1beta"}/models/${encodeURIComponent(model)}:generateContent`;
    if (process.env.GEMINI_API_KEY) headers["x-goog-api-key"] = process.env.GEMINI_API_KEY;
    payload = { contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: type, data: bytes.toString("base64") } }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } };
  }
  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload), signal, redirect: "error" });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Gemini gagal (HTTP ${response.status}). Periksa model dan konfigurasi server.`); }
  const output = await boundedBytes(response, 42 * 1024 * 1024);
  if (response.headers.get("content-type")?.startsWith("image/")) { imageType(output); return output; }
  return providerImage(JSON.parse(output.toString("utf8")), endpoint, signal);
}

async function dewatermarkImage(bytes: Buffer, type: string, signal: AbortSignal) {
  const form = new FormData();
  form.set("original_preview_image", new Blob([new Uint8Array(bytes)], { type }), "photo.jpg");
  form.set("remove_text", "true");
  form.set("predict_mode", "3.0");
  const response = await fetch("https://platform.dewatermark.ai/api/object_removal/v2/erase", { method: "POST", headers: { "X-API-KEY": process.env.DEWATERMARK_API_KEY! }, body: form, signal, redirect: "error" });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Dewatermark gagal (HTTP ${response.status}).`); }
  const data = JSON.parse((await boundedBytes(response, 42 * 1024 * 1024)).toString("utf8"));
  if (data.status !== "success" || typeof data.edited_image?.image !== "string") throw new Error("Dewatermark tidak mengembalikan gambar.");
  const output = Buffer.from(data.edited_image.image.replace(/^data:image\/[^;]+;base64,/, ""), "base64");
  imageType(output);
  return output;
}

export async function POST(req: Request) {
  try {
    checkSameOrigin(req);
    await rateLimit(req, "watermark-attempt", 10, 60);
    await rateLimit(req, "watermark-hour", 30, 3600);
  } catch (error) { return abuseResponse(error); }

  let body: { imageUrl?: unknown; provider?: unknown };
  try {
    body = await readJsonBody(req);
  } catch (error) { return abuseResponse(error); }
  if (!body || typeof body.imageUrl !== "string" || !isAllowedHost(body.imageUrl)) return Response.json({ error: "URL foto tidak valid atau host tidak diizinkan." }, { status: 400 });
  const provider = body.provider || "gemini";
  if (!["gemini", "openai", "dewatermark"].includes(provider as string)) return Response.json({ error: "Provider tidak dikenal." }, { status: 400 });
  if ((provider === "gemini" && !process.env.GEMINI_API_KEY && !process.env.GEMINI_BASE_URL) ||
    (provider === "openai" && !process.env.OPENAI_API_KEY && !process.env.OPENAI_BASE_URL) ||
    (provider === "dewatermark" && !process.env.DEWATERMARK_API_KEY)) {
    return Response.json({ error: "Provider belum dikonfigurasi di server.", fallback: "original" }, { status: 503 });
  }

  let reservation: Awaited<ReturnType<typeof reserveWatermark>>;
  try { reservation = await reserveWatermark(req); } catch (error) { return abuseResponse(error); }
  try {
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(150000)]);
    const original = await originalImage(body.imageUrl, signal);
    const output = provider === "gemini" ? await geminiImage(original.bytes, original.type, signal)
      : provider === "openai" ? await editWithOpenAI(original.bytes, original.type, signal)
      : await dewatermarkImage(original.bytes, original.type, signal);
    const type = imageType(output);
    await reservation.finish(true);
    const quota = await watermarkQuota(req);
    return new Response(new Uint8Array(output), { headers: {
      "Content-Type": type, "Cache-Control": "private, no-store", "X-AI-Provider": String(provider),
      "X-Watermark-Remaining": String(quota.remaining), "Set-Cookie": reservation.cookie,
    } });
  } catch (error) {
    await reservation.finish(false).catch(() => {});
    return Response.json({ error: error instanceof Error ? error.message : "Foto gagal diproses.", fallback: "original" }, { status: 502, headers: { "Set-Cookie": reservation.cookie, "Cache-Control": "no-store" } });
  }
}
