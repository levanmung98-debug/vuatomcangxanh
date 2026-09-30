// Service Worker for Vua Tôm Càng Xanh PWA - Version 7
const CACHE_NAME = "vuatomcangxanh-v12";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/index.css",
  "/manifest.json",
  "/manifest.webmanifest",
  "/assets/index-v7.js",
  "/assets/index-Os1X4Z7e.js",
  "/assets/index-tn0RQdqM.css",
  "https://iili.io/nue4riJ.png",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url, { cache: "reload" }).then((res) => {
            if (res && res.status === 200) {
              return cache.put(url, res);
            }
          }).catch(() => {})
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Cleaning old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Bypass APIs
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network First for Navigation, HTML, and JS
  if (
    event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.includes("/assets/")
  ) {
    event.respondWith(
      fetch(event.request, { cache: "no-cache" })
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === "opaque")) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
