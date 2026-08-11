const CACHE_NAME = 'sticky-ai-static-v1';

// We explicitly only cache safe static assets.
// No API responses, HTML pages, or user data are cached to prevent leaks.
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Don't fail install if a file is missing
      return cache.addAll(STATIC_ASSETS).catch(console.error);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. DYNAMIC & SENSITIVE ROUTES - NETWORK ONLY
  // Never cache API routes, auth, TRPC, AI streams, etc.
  if (url.pathname.startsWith('/api') || 
      url.pathname.startsWith('/dashboard') || 
      url.pathname.startsWith('/notes') || 
      url.pathname.startsWith('/knowledge-base')) {
    return event.respondWith(fetch(event.request));
  }

  // 2. STATIC ASSETS - CACHE FIRST
  // Cache Next.js built static chunks, CSS, and images
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/_next/image') ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.error('[SW] Fetch failed for static asset', err);
        });
      })
    );
    return;
  }

  // 3. EVERYTHING ELSE (HTML pages) - NETWORK ONLY
  // This ensures users always get fresh authentication context and data.
  event.respondWith(fetch(event.request));
});
