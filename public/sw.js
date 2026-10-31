const CACHE_NAME = 'meenmart-partners-pwa-v15';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Firebase RTDB / Google auth / external API requests entirely
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('firebase.google.com') ||
    url.pathname.includes('/.lp') ||
    url.pathname.includes('/.ws') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Bypass hashed Vite assets from SW caching to prevent cross-world modulepreload mismatches
  // Hashed assets (/assets/**) are already cached permanently via HTTP headers
  if (url.pathname.startsWith('/assets/')) {
    return;
  }

  // Network-First for HTML navigations: always get latest index.html when online!
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // caches.match() resolves to undefined on a miss, and a Promise is
          // always truthy, so these must be awaited rather than chained with ||.
          return (
            (await caches.match('/index.html')) ||
            (await caches.match('/')) ||
            Response.error()
          );
        })
    );
    return;
  }

  // Stale-While-Revalidate for static icons/manifest
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
