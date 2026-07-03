import { NextResponse } from "next/server";
import { extractPhotos } from "@/lib/parse";

export const runtime = "nodejs";
export const maxDuration = 30;

const FOTOYU_CART_URL = "https://api.fotoyu.com/gs/v1/carts/preview";

const BROWSER_HEADERS: HeadersInit = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://fotoyu.com/",
  Origin: "https://fotoyu.com",
};

interface CartRequestBody {
  token?: string;
  method?: "GET" | "POST";
  body?: unknown;
}

// #region agent log
async function dbg(hypothesisId: string, location: string, message: string, data?: Record<string, unknown>) {
  try {
    await fetch("http://127.0.0.1:7316/ingest/55a14728-2337-435e-b1ac-0b1e2bba7bc7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "39b4d3" },
      body: JSON.stringify({ sessionId: "39b4d3", runId: "run1", hypothesisId, location, message, data: data ?? {}, timestamp: Date.now() }),
    });
  } catch {}
}
// #endregion

// Extract access_token from a raw persist:root value (Redux persisted state).
// The user field inside persist:root is itself a JSON-encoded string.
// Returns the Bearer token or null if not found.
//
// Robust against truncated/malformed input: instead of requiring the entire
// persist:root JSON to be valid, we regex-extract the user field's
// access_token JWT directly. This works even if the pasted value is cut off.
async function extractToken(rawInput: string): Promise<string | null> {
  // #region agent log
  await dbg("B", "cart/route.ts:extractToken:entry", "extractToken called", {
    inputLen: rawInput.length,
    startsWith: rawInput.slice(0, 60),
    endsWith: rawInput.slice(-60),
    hasAccessTokenLiteral: rawInput.includes("access_token"),
    hasEscapedAccess: rawInput.includes('\\"access_token\\"'),
  });
  // #endregion

  // 1. Try rawInput as a direct Bearer token (plain JWT).
  if (/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(rawInput.trim())) {
    // #region agent log
    await dbg("A", "cart/route.ts:extractToken:jwt-direct", "Matched direct JWT");
    // #endregion
    return rawInput.trim();
  }

  // 2. Regex-extract access_token from the (possibly truncated) persist:root.
  const m = rawInput.match(/"access_token"\s*:\s*"(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)"/);
  // #region agent log
  await dbg("D", "cart/route.ts:extractToken:regex", "Regex match attempt", {
    matched: !!(m && m[1]),
    matchedTokenPreview: m && m[1] ? m[1].slice(0, 40) + "..." : null,
    pattern: '"access_token"\\s*:\\s*"(eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+)"',
  });
  // #endregion
  if (m && m[1]) return m[1];

  // 3. Fallback: try full JSON parse (handles well-formed input + double-stringified)
  let root: unknown;
  try {
    root = JSON.parse(rawInput);
  } catch {
    // #region agent log
    await dbg("A", "cart/route.ts:extractToken:json-parse-failed", "JSON.parse failed (expected for truncated input)");
    // #endregion
    return null;
  }
  if (typeof root === "string") {
    try {
      root = JSON.parse(root);
    } catch {
      return null;
    }
  }
  if (!root || typeof root !== "object") return null;

  const userStr = (root as Record<string, unknown>).user;
  if (typeof userStr !== "string") return null;

  let user: unknown;
  try {
    user = JSON.parse(userStr);
  } catch {
    return null;
  }
  if (!user || typeof user !== "object") return null;

  const accessToken = (user as Record<string, unknown>).access_token;
  if (typeof accessToken === "string" && accessToken.startsWith("eyJ")) {
    return accessToken;
  }

  return null;
}

export async function POST(req: Request) {
  let payload: CartRequestBody;
  try {
    payload = (await req.json()) as CartRequestBody;
  } catch (e) {
    // #region agent log
    await dbg("C", "cart/route.ts:POST:body-parse-failed", "Body JSON parse failed", { err: String(e) });
    // #endregion
    return NextResponse.json(
      { error: "Body harus berupa JSON valid." },
      { status: 400 }
    );
  }

  // #region agent log
  await dbg("B", "cart/route.ts:POST:payload-received", "Payload received", {
    hasToken: !!payload.token,
    tokenType: typeof payload.token,
    tokenLen: payload.token ? payload.token.length : 0,
    tokenPreview: payload.token ? payload.token.slice(0, 80) : null,
    tokenEnd: payload.token ? payload.token.slice(-80) : null,
    method: payload.method,
  });
  // #endregion

  const rawInput = payload.token;
  if (!rawInput || typeof rawInput !== "string") {
    // #region agent log
    await dbg("B", "cart/route.ts:POST:empty-token", "Token field empty or not string", { hasToken: !!rawInput });
    // #endregion
    return NextResponse.json(
      {
        error:
          "Field `token` wajib diisi. Paste seluruh value dari localStorage key `persist:root` atau token Bearer langsung.",
      },
      { status: 400 }
    );
  }

  const token = await extractToken(rawInput);
  // #region agent log
  await dbg("A", "cart/route.ts:POST:extract-result", "extractToken returned", {
    success: !!token,
    tokenPreview: token ? token.slice(0, 30) + "..." : null,
  });
  // #endregion
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Gagal menemukan access_token di data yang kamu paste. " +
          "Pastikan kamu menyalin seluruh value dari key `persist:root` " +
          "di DevTools → Application → Local Storage → fotoyu.com.",
      },
      { status: 400 }
    );
  }

  const method = payload.method === "POST" ? "POST" : "GET";
  const headers = new Headers(BROWSER_HEADERS as HeadersInit);
  headers.set("Authorization", `Bearer ${token}`);

  const fetchInit: RequestInit = { method, headers };
  if (method === "POST") {
    headers.set("Content-Type", "application/json");
    fetchInit.body =
      payload.body !== undefined
        ? JSON.stringify(payload.body)
        : JSON.stringify({});
  }

  let upstream: Response;
  try {
    upstream = await fetch(FOTOYU_CART_URL, fetchInit);
  } catch {
    return NextResponse.json(
      { error: "Gagal menghubungi server fotoyu." },
      { status: 502 }
    );
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return NextResponse.json(
      { error: "Token tidak valid atau sudah expired. Silakan ambil data persist:root baru." },
      { status: 401 }
    );
  }
  if (upstream.status === 404) {
    return NextResponse.json(
      { error: "Cart tidak ditemukan (mungkin keranjang kosong)." },
      { status: 404 }
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `fotoyu mengembalikan HTTP ${upstream.status}.` },
      { status: 502 }
    );
  }

  const raw = await upstream.text();
  let photos;
  try {
    photos = extractPhotos(raw);
  } catch {
    return NextResponse.json(
      { error: "Response dari fotoyu tidak terduga (format tidak dikenal)." },
      { status: 502 }
    );
  }

  return NextResponse.json({ photos, count: photos.length });
}
