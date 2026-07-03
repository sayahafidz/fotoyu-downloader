import { NextResponse } from "next/server";
import { extractPhotos } from "@/lib/parse";

export const runtime = "nodejs";
export const maxDuration = 30;

const FOTOYU_CART_URL = "https://api.fotoyu.com/gs/v1/carts/preview";

const BROWSER_HEADERS: HeadersInit = {
  Authorization: "", // diisi per-request di bawah
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

  const token = payload.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Field `token` wajib diisi." },
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
      { error: "Token tidak valid atau sudah expired. Silakan ambil token baru." },
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
