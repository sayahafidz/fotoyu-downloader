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

// Public CORS/image proxies that operate from non-Vercel IP ranges.
// When our own proxy is blocked by the CDN (Vercel datacenter IP), these
// public services can often fetch successfully since they use residential
// or diverse IP pools.
const PUBLIC_PROXIES = [
  // wsrv.nl - open-source image proxy with CORS support
  "https://wsrv.nl/?url=${URL}&output=auto",
  // Cloudflare-based open image proxy
  "https://imgproxy.gamma.app/${URL}",
];

async function fetchViaPublicProxy(target: string): Promise<Response | null> {
  for (const tmpl of PUBLIC_PROXIES) {
    try {
      const url = tmpl.replace("${URL}", encodeURIComponent(target));
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok && res.body) return res;
    } catch {
      continue;
    }
  }
  return null;
}

// Streams a Response body back to the client with CORS and cache headers.
function streamProxyResponse(upstream: Response, opts?: { downloadFilename?: string }): Response {
  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  headers.set("Content-Type", ct && ct.startsWith("image/") ? ct : "image/jpeg");
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  headers.set("Access-Control-Allow-Origin", "*");
  if (opts?.downloadFilename) {
    headers.set("Content-Disposition", `attachment; filename="${opts.downloadFilename}"`);
  }
  return new Response(upstream.body, { status: 200, headers });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  const mode = searchParams.get("mode") || "display";
  const filename = searchParams.get("filename") || undefined;

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

  let upstream: Response | null = null;

  // Strategy 1: Direct upstream fetch (fails on Vercel due to datacenter IP block)
  try {
    upstream = await fetchUpstream(target);
  } catch {
    // Will try public proxy below
  }

  // Strategy 2: Public CORS proxy fallback (different IP ranges)
  if (!upstream || !upstream.ok || !upstream.body) {
    const pub = await fetchViaPublicProxy(target);
    if (pub) upstream = pub;
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    const status = upstream?.status || 502;
    return NextResponse.json(
      {
        error: `Upstream mengembalikan HTTP ${status}.`,
        fallback: "direct",
      },
      { status: 502 }
    );
  }

  return streamProxyResponse(upstream, {
    downloadFilename: mode === "download" ? filename : undefined,
  });
}
