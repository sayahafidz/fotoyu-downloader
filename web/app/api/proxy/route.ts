import { NextResponse } from "next/server";
import { isAllowedHost } from "@/lib/parse";

export const runtime = "nodejs";
// Allow longer runtime for slow image CDN responses.
export const maxDuration = 60;
// Cache proxy responses at the edge (CDN) so repeated views are instant.
export const dynamic = "force-dynamic";

// Headers mimic a real browser request to fotoyu.com. cfsimgproxy.fototree.com
// rejects requests that look like bots/server-side fetches (Vercel IPs get 403),
// so we send a complete, realistic browser fingerprint.
const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://fotoyu.com/",
  Origin: "https://fotoyu.com",
  "Sec-Fetch-Dest": "image",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Ch-Ua":
    '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

async function fetchUpstream(target: string): Promise<Response> {
  // Try up to 3 times. Upstream CDN sometimes returns transient 403/hang
  // when hit from datacenter IPs; a retry often succeeds.
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(target, {
        headers: BROWSER_HEADERS,
        cache: "force-cache",
        // AbortController gives us a hard timeout per attempt so a hung
        // upstream does not eat the whole 60s serverless budget.
        signal: AbortSignal.timeout(15000),
      });
      // Retry on 403/5xx; return immediately on success or 4xx (non-403).
      if (res.status === 403 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        // Drain & free the body before retrying.
        try {
          await res.arrayBuffer();
        } catch {
          // ignore
        }
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
    }
  }
  throw lastErr ?? new Error("Gagal menghubungi upstream setelah 3 percobaan.");
}

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
    upstream = await fetchUpstream(target);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghubungi upstream.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status;
    return NextResponse.json(
      {
        error: `Upstream mengembalikan HTTP ${status}.`,
        // Hint the client to try the direct URL (browsers fetch from the
        // user's IP, which usually bypasses the datacenter IP block).
        fallback: "direct",
      },
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
