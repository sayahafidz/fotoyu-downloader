const PROMPT = "Remove text overlays and watermarks from this photo. Restore covered areas using natural surrounding textures. Preserve identity, facial structure, body proportions, expression, composition, and background. Return an edited image, not a text description.";
const MAX_BYTES = 30 * 1024 * 1024;

export async function boundedBytes(response: Response, maximum = MAX_BYTES) {
  if (Number(response.headers.get("content-length")) > maximum) { await response.body?.cancel(); throw new Error("Respons gambar terlalu besar."); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Respons gambar kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) throw new Error("Respons gambar terlalu besar.");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}

export function imageType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "image/webp";
  throw new Error("Provider tidak mengembalikan gambar PNG, JPEG, atau WebP yang valid.");
}

export function providerEndpoint(base: string, kind: "chat" | "edits") {
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Base URL provider harus HTTPS tanpa kredensial, query, atau fragment.");
  const path = kind === "chat" ? "/chat/completions" : "/images/edits";
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (!url.pathname.endsWith(path)) url.pathname += (url.pathname.endsWith("/v1") ? "" : "/v1") + path;
  return url.href;
}

export function decodeImage(data: any): Buffer {
  const message = data?.choices?.[0]?.message;
  const inline = data?.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData || part.inline_data);
  let encoded = data?.data?.[0]?.b64_json || inline?.inlineData?.data || inline?.inline_data?.data;
  const parts = Array.isArray(message?.content) ? message.content : [];
  const candidates = [message?.content, ...parts.map((part: any) => part.image_url?.url || part.image_url || part.text), ...(message?.images || []).map((part: any) => part.image_url?.url || part.image_url || part.url)];
  if (!encoded) {
    for (const value of candidates) {
      if (typeof value !== "string") continue;
      const match = value.match(/data:image\/[a-zA-Z+.-]+;base64,([A-Za-z0-9+/=\r\n]+)/);
      if (match) { encoded = match[1]; break; }
    }
  }
  if (typeof encoded !== "string" || encoded.length > MAX_BYTES * 1.4) {
    console.warn("[image-provider] no inline image", { topLevelKeys: Object.keys(data || {}), messageKeys: Object.keys(message || {}), contentType: typeof message?.content, partTypes: parts.map((part: any) => part.type), finishReason: data?.choices?.[0]?.finish_reason });
    throw new Error("Model atau router mengembalikan teks, bukan output gambar yang didukung. Periksa model image-capable dan format respons router.");
  }
  const bytes = Buffer.from(encoded, "base64");
  imageType(bytes);
  return bytes;
}

export async function providerImage(data: any, endpoint: string, signal: AbortSignal): Promise<Buffer> {
  const message = data?.choices?.[0]?.message;
  const parts = Array.isArray(message?.content) ? message.content : [];
  const urls = [data?.data?.[0]?.url, ...(message?.images || []).map((part: any) => part.image_url?.url || part.url), ...parts.map((part: any) => part.image_url?.url)];
  if (typeof message?.content === "string") {
    const markdown = message.content.match(/!\[[^\]]*\]\((https:\/\/[^\s)]+)\)/);
    if (markdown) urls.push(markdown[1]);
  }
  const remote = urls.find((value) => typeof value === "string" && value.startsWith("https://"));
  if (!remote) return decodeImage(data);
  const url = new URL(remote);
  const allowedOrigins = [new URL(endpoint).origin, ...(process.env.PROVIDER_IMAGE_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean)];
  if (url.username || url.password || !allowedOrigins.includes(url.origin)) throw new Error("Router mengembalikan URL gambar di host yang belum diizinkan. Atur PROVIDER_IMAGE_ORIGINS di server atau gunakan output base64.");
  const response = await fetch(url, { signal, redirect: "error", cache: "no-store" });
  if (!response.ok) { await response.body?.cancel(); throw new Error("Gambar hasil edit dari router gagal dimuat."); }
  const bytes = await boundedBytes(response);
  imageType(bytes);
  return bytes;
}

export async function editWithOpenAI(image: Buffer, contentType: string, signal: AbortSignal) {
  const key = process.env.OPENAI_API_KEY || "";
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const kind = process.env.OPENAI_API_MODE === "chat" ? "chat" : "edits";
  const endpoint = providerEndpoint(base, kind);
  const model = process.env.OPENAI_MODEL || "gpt-image-1";
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
  let body: BodyInit;
  if (kind === "chat") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ model, stream: false, messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: `data:${contentType};base64,${image.toString("base64")}` } }] }] });
  } else {
    const form = new FormData();
    form.set("model", model);
    form.set("prompt", PROMPT);
    form.set("image", new Blob([new Uint8Array(image)], { type: contentType }), contentType === "image/png" ? "photo.png" : contentType === "image/webp" ? "photo.webp" : "photo.jpg");
    body = form;
  }
  const response = await fetch(endpoint, { method: "POST", headers, body, signal, redirect: "error" });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Provider OpenAI gagal (HTTP ${response.status}). Periksa model dan konfigurasi server.`); }
  const bytes = await boundedBytes(response, MAX_BYTES * 1.4);
  if (response.headers.get("content-type")?.startsWith("image/")) { imageType(bytes); return bytes; }
  return providerImage(JSON.parse(bytes.toString("utf8")), endpoint, signal);
}
