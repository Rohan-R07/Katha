// Service Worker for KHATA Kirana Digital Ledger PWA
const CACHE_NAME = "khata-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/khata-logo.svg",
  "/favicon.svg",
  "/kirana-bg.jpg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // CRITICAL REQUIREMENT 8:
  // API and mutating requests must NEVER be falsely reported as successful by offline cache.
  // API calls always bypass cache and fail to standard network error when offline.
  if (event.request.url.includes("/api/")) {
    return;
  }

  // Only GET requests for pages, scripts, styles, and static assets are cached.
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            if (response.status === 200 && response.type === "basic") {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => {
            // For navigation requests, fallback to index.html offline
            if (event.request.mode === "navigate") {
              return caches.match("/index.html");
            }
            return cached;
          })
      );
    })
  );
});
