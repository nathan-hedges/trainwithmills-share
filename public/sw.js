/* Train with Mills service worker.
 *
 * Two jobs:
 *  1. Slow/offline navigations: try the network for up to NAV_TIMEOUT ms; if it
 *     fails or times out, serve the precached branded loading screen (/offline),
 *     which auto-retries. No more white screen on bad WiFi.
 *  2. Static assets (hashed /_next/static files, fonts, icons): cache-first, so
 *     repeat launches are fast and work offline.
 *
 * It NEVER touches /api requests or non-GET methods.
 * Bump VERSION to invalidate all caches after significant changes.
 */
const VERSION = "twm-v1";
const OFFLINE_CACHE = `${VERSION}-offline`;
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";
const NAV_TIMEOUT = 8000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      // cache: "reload" bypasses the HTTP cache so we snapshot a fresh copy.
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)));
      // Navigation preload makes the network request start before this worker boots.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

/** Is this a static asset we can safely cache? (immutable/hashed or brand files) */
function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|ico|jpg|jpeg|webp|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return; // never intercept the API

  // 1) Page navigations: network (with preload) raced against a timeout;
  //    fall back to the cached branded loading screen.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const network = (async () => (await event.preloadResponse) || fetch(req))();
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("nav-timeout")), NAV_TIMEOUT),
          );
          return await Promise.race([network, timeout]);
        } catch {
          const cached = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
          return (
            cached ||
            new Response("You're offline. Please reconnect and try again.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }

  // 2) Static assets: cache-first (hashed filenames make this safe), fill the
  //    cache from the network on first sight.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
  }
});
