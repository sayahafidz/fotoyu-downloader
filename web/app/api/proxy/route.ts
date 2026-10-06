import { NextResponse } from "next/server";
import { isAllowedHost, sanitizeFilename } from "@/lib/parse";
import { abuseResponse, rateLimit } from "@/lib/abuse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  Referer: "https://fotoyu.com/",
  Origin: "https://fotoyu.com",
};

async function fetchAllowed(target: string, headers: HeadersInit, requestSignal: AbortSignal): Promise<Response> {
  let current = target;
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(60000)]);
  for (let hop = 0; hop < 5; hop++) {
    if (!isAllowedHost(current)) throw new Error("Host redirect CDN tidak diizinkan.");
    const response = await fetch(current, { headers, cache: "no-store", redirect: "manual", signal });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("Redirect CDN tidak valid.");
    current = new URL(location, current).href;
  }
  throw new Error("Terlalu banyak redirect CDN.");
}

async function fetchUpstream(target: string, signal: AbortSignal): Promise<Response> {
  // Attempt 1: Fast direct fetch
  try {
    const res = await fetchAllowed(target, UPSTREAM_HEADERS, signal);

    // If 200 OK or 404 Not Found, return immediately (don't waste time retrying 404s)
    if (res.ok || res.status === 404 || res.status === 410) {
      return res;
    }
    await res.body?.cancel();
  } catch {
    signal.throwIfAborted();
    // Retry once on network timeout/glitch
  }

  // Attempt 2: Quick retry with minimal headers
  try {
    const res2 = await fetchAllowed(target, {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://fotoyu.com/",
        Accept: "image/*,*/*;q=0.8",
    }, signal);
    return res2;
  } catch (e: any) {
    throw new Error(e?.message || "Upstream CDN unreachable");
  }
}

function streamProxyResponse(upstream: Response, opts?: { downloadFilename?: string }): Response {
  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  headers.set("Content-Type", ct && ct.startsWith("image/") ? ct : "image/jpeg");
  headers.set("Cache-Control", opts?.downloadFilename ? "private, no-store" : "private, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");

  // fetch may decompress upstream bytes: forwarding its Content-Length can
  // truncate the stream or cause a length mismatch on serverless hosting.

  if (opts?.downloadFilename) {
    const safe = sanitizeFilename(opts.downloadFilename).slice(0, 180) || "foto.jpg";
    const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
    headers.set("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`);
  }
  let size = 0;
  const boundedStream = upstream.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > 30 * 1024 * 1024) { controller.error(new Error("Foto melebihi batas 30 MB.")); return; }
      controller.enqueue(chunk);
    },
  }));
  return new Response(boundedStream, { status: 200, headers });
}

export async function GET(req: Request) {
  try { await rateLimit(req, "proxy", 180); } catch (error) { return abuseResponse(error); }
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

  try {
    const upstream = await fetchUpstream(target, req.signal);

    if (upstream.status === 404) {
      return NextResponse.json(
        { error: "Foto tidak ditemukan (URL CDN sudah kadaluarsa atau dihapus).", status: 404 },
        { status: 404 }
      );
    }

    if (!upstream.ok || !upstream.body) {
      console.warn("[proxy] CDN request rejected", {
        status: upstream.status,
        host: new URL(target).hostname,
        server: upstream.headers.get("server"),
        cdnRay: upstream.headers.get("cf-ray"),
        mitigation: upstream.headers.get("cf-mitigated"),
        contentType: upstream.headers.get("content-type"),
      });
      await upstream.body?.cancel();
      return NextResponse.json(
        {
          error: upstream.status === 403
            ? "CDN menolak akses dari server hosting. Coba buka foto sumber; jika bisa, akses browser tersedia tetapi akses server ditolak."
            : `Upstream CDN mengembalikan status ${upstream.status}.`,
          status: upstream.status,
          code: upstream.status === 403 ? "CDN_ACCESS_DENIED" : "CDN_REQUEST_FAILED",
        },
        { status: upstream.status || 502, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (Number(upstream.headers.get("content-length")) > 30 * 1024 * 1024) {
      await upstream.body.cancel();
      return NextResponse.json({ error: "Foto melebihi batas 30 MB." }, { status: 413 });
    }
    if (contentType && !["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "application/octet-stream"].includes(contentType)) {
      await upstream.body.cancel();
      return NextResponse.json({ error: "CDN mengirim halaman error, bukan file foto." }, { status: 502 });
    }

    return streamProxyResponse(upstream, {
      downloadFilename: mode === "download" ? filename || "foto.jpg" : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Gagal menghubungi CDN: ${err?.message || "Timeout"}`, status: 504 },
      { status: 504 }
    );
  }
}
