import { NextResponse } from "next/server";
import { isAllowedHost } from "@/lib/parse";

export const runtime = "nodejs";
// Allow longer runtime for slow image CDN responses.
export const maxDuration = 60;
// Cache proxy responses at the edge (CDN) so repeated views are instant.
export const dynamic = "force-dynamic";

const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fotoyu.com/",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json(
      { error: "Parameter `url` wajib diisi." },
      { status: 400 }
    );
  }

  if (!isAllowedHost(target)) {
    return NextResponse.json(
      { error: "Host tidak diizinkan oleh proxy." },
      { status: 403 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: BROWSER_HEADERS,
      cache: "force-cache",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghubungi upstream.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream mengembalikan HTTP ${upstream.status}.` },
      { status: 502 }
    );
  }

  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  headers.set(
    "Content-Type",
    ct && ct.startsWith("image/") ? ct : "image/jpeg"
  );
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  headers.set("Access-Control-Allow-Origin", "*");

  // Stream the upstream body straight back to the client without buffering,
  // so we stay well under Vercel's 4.5MB response body limit.
  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
