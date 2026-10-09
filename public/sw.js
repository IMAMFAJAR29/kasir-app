const CACHE_NAME = "anima-pos-v2";
const APP_ROUTE = "/pos";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(APP_ROUTE, { credentials: "include" });
        if (response.ok) {
          await cache.put(APP_ROUTE, response.clone());
          const html = await response.text();
          const assets = Array.from(
            html.matchAll(/(?:src|href)="([^"]*_next\/static\/[^"]+)"/g),
            (match) => new URL(match[1].replace(/&amp;/g, "&"), self.location)
          );
          await Promise.all(
            assets.map(async (asset) => {
              try {
                const assetResponse = await fetch(asset);
                if (assetResponse.ok) {
                  await cache.put(asset, assetResponse);
                }
              } catch (error) {
                console.warn("POS asset belum dapat dicache:", error);
              }
            })
          );
        }
      } catch (error) {
        console.warn("Halaman POS offline belum dapat dicache:", error);
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith("anima-pos-") && cacheName !== CACHE_NAME
          )
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
            await cache.put(url.pathname, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(request)) ||
            (await cache.match(url.pathname)) ||
            (await cache.match(APP_ROUTE)) ||
            Response.error()
          );
        })
    );
    return;
  }

  if (
    url.pathname === "/api/products" ||
    url.pathname === "/api/categories"
  ) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || Response.error();
        })
    );
  }
});
