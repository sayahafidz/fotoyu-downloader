import { NextResponse } from "next/server";
import { extractPhotos } from "@/lib/parse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body harus berupa JSON valid." },
      { status: 400 }
    );
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
