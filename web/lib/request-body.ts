import { AbuseError } from "./abuse.ts";

export async function readJsonBody(req: Request, maximum = 16384): Promise<any> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AbuseError("Content-Type harus application/json.", 415, 0, "INVALID_CONTENT_TYPE");
  if (Number(req.headers.get("content-length")) > maximum) throw new AbuseError("Body terlalu besar.", 413, 0, "BODY_TOO_LARGE");
  const reader = req.body?.getReader();
  if (!reader) throw new AbuseError("Body JSON wajib diisi.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) throw new AbuseError("Body terlalu besar.", 413, 0, "BODY_TOO_LARGE");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new AbuseError("Body harus berupa objek JSON valid.", 400, 0, "INVALID_JSON"); }
}
