// Service Worker for Fotoyu Downloader PWA
const CACHE_NAME = "fotoyudl-cache-v3";
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // CRITICAL: NEVER intercept cross-origin requests or /api/ proxy endpoints
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // HTML must follow the deployment. A stale shell can reference JS chunks
  // that disappeared after a production release.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/").then(response => response || new Response("Offline", { status: 503 }))));
    return;
  }
  // Next handles immutable chunk caching; never serve an older framework asset.
  if (url.pathname.startsWith("/_next/")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background for next time
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});
