// Client-side helpers for managing the fotoyu Bearer token and fetching
// the cart preview through our backend proxy (/api/cart).

import type { Photo } from "./parse";

const TOKEN_KEY = "fotoyu_bearer_token";

export function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export interface CartFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

// Call /api/cart on our backend, which proxies to fotoyu using the token.
// Returns the list of photos extracted from the cart preview response.
export async function fetchCartViaToken(
  token: string,
  options: CartFetchOptions = {}
): Promise<Photo[]> {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      method: options.method ?? "POST",
      body: options.body ?? { page: 1, limit: 100, selected_products: [] },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) || `Gagal mengambil cart (HTTP ${res.status}).`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const photos = (data as { photos?: Photo[] })?.photos;
  if (!Array.isArray(photos)) {
    throw new Error("Response backend tidak terduga.");
  }
  return photos;
}
