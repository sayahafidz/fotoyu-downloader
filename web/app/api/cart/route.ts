import { NextResponse } from "next/server";
import { extractPhotos } from "@/lib/parse";

export const runtime = "nodejs";
export const maxDuration = 30;

const FOTOYU_CART_URL = "https://api.fotoyu.com/gs/v1/carts/preview";

const BROWSER_HEADERS: HeadersInit = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
  Referer: "https://www.fotoyu.com/",
  Origin: "https://www.fotoyu.com",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "Sec-GPC": "1",
  Priority: "u=1, i",
};

interface CartRequestBody {
  token?: string;
  method?: "GET" | "POST";
  body?: unknown;
  cookies?: string;
}

// Extract access_token from a raw persist:root value (Redux persisted state).
// The user field inside persist:root is itself a JSON-encoded string.
// Returns the Bearer token or null if not found.
//
// Robust against truncated/malformed input: instead of requiring the entire
// persist:root JSON to be valid, we regex-extract the user field's
// access_token JWT directly. This works even if the pasted value is cut off.
// The regex also handles both literal "access_token":"..." and escaped
// \"access_token\":\"...\" (when input is double-JSON-stringified).
function extractToken(rawInput: string): string | null {
  // 1. Try rawInput as a direct Bearer token (plain JWT).
  if (/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(rawInput.trim())) {
    return rawInput.trim();
  }

  // 2. Regex-extract access_token from the (possibly truncated) persist:root.
  //    Match against both literal "access_token":"..." and escaped \"access_token\":\"..."
  //    because the input may be single or double JSON-stringified.
  const m = rawInput.match(
    /\\?"access_token\\?"\s*:\s*\\?"(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\\?"/
  );
  if (m && m[1]) return m[1];

  // 3. Fallback: try full JSON parse (handles well-formed input + double-stringified)
  let root: unknown;
  try {
    root = JSON.parse(rawInput);
  } catch {
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
  } catch {
    return NextResponse.json(
      { error: "Body harus berupa JSON valid." },
      { status: 400 }
    );
  }

  const rawInput = payload.token;
  if (!rawInput || typeof rawInput !== "string") {
    return NextResponse.json(
      {
        error:
          "Field `token` wajib diisi. Paste seluruh value dari localStorage key `persist:root` atau token Bearer langsung.",
      },
      { status: 400 }
    );
  }

  const token = extractToken(rawInput);
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

  // The upstream cart preview endpoint now requires POST with a pagination
  // payload. Default to the same body the fotoyu web app sends.
  const method = payload.method === "GET" ? "GET" : "POST";
  const headers = new Headers(BROWSER_HEADERS as HeadersInit);
  headers.set("Authorization", `Bearer ${token}`);

  const fetchInit: RequestInit = { method, headers };
  if (typeof payload.cookies === "string" && payload.cookies) {
    headers.set("Cookie", payload.cookies);
  }
  if (method === "POST") {
    headers.set("Content-Type", "application/json");
    fetchInit.body =
      payload.body !== undefined
        ? JSON.stringify(payload.body)
        : JSON.stringify({ page: 1, limit: 100, selected_products: [] });
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
    const upstreamBody = await upstream.text().catch(() => "");
    console.error("[cart] upstream 401/403:", upstream.status, upstreamBody.slice(0, 500));
    return NextResponse.json(
      { error: "Token tidak valid atau sudah expired. Silakan ambil data persist:root baru.", debug: upstreamBody.slice(0, 500) },
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
