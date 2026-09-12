// Service Worker for Vua Tôm Càng Xanh PWA - Full Offline & Online Support
const CACHE_NAME = 'vuatomcangxanh-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/manifest.webmanifest',
  '/assets/index-Os1X4Z7e.js',
  'https://iili.io/nd5686N.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          fetch(url, { mode: 'no-cors' }).then(res => {
            if (res) return cache.put(url, res);
          }).catch(err => console.warn('Cache prefetch non-fatal error:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // For API requests, don't intercept unless network fails
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for local assets and external scripts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is navigation, return cached index.html
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html') || cachedResponse;
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
