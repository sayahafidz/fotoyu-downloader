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
  // #region agent log
  try {
    await fetch("http://127.0.0.1:7316/ingest/55a14728-2337-435e-b1ac-0b1e2bba7bc7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "39b4d3" },
      body: JSON.stringify({
        sessionId: "39b4d3",
        runId: "run1",
        hypothesisId: "B",
        location: "session.ts:fetchCartViaToken:entry",
        message: "fetchCartViaToken called",
        data: {
          inputLen: token.length,
          inputStart: token.slice(0, 80),
          inputEnd: token.slice(-80),
          hasAccessToken: token.includes("access_token"),
        },
        timestamp: Date.now(),
      }),
    });
  } catch {}
  // #endregion

  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      method: options.method ?? "GET",
      body: options.body,
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
