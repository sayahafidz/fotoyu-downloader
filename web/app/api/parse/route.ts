import { NextResponse } from "next/server";
import { extractPhotos } from "@/lib/parse";
import { abuseResponse, checkSameOrigin, rateLimit } from "@/lib/abuse";
import { readJsonBody } from "@/lib/request-body";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try { checkSameOrigin(req); await rateLimit(req, "parse", 20); } catch (error) { return abuseResponse(error); }
  let body: unknown;
  try {
    body = await readJsonBody(req, 2 * 1024 * 1024);
  } catch (error) {
    return abuseResponse(error);
  }

  const raw = (body as { raw?: string } | null)?.raw;
  if (!raw || typeof raw !== "string") {
    return NextResponse.json(
      { error: "Field `raw` (string JSON response) wajib diisi." },
      { status: 400 }
    );
  }

  let photos;
  try {
    photos = extractPhotos(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mem-parse JSON.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({
    photos,
    count: photos.length,
  });
}
