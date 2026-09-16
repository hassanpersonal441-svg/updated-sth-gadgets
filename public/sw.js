// STH Gadgets — High Performance PWA Service Worker
const CACHE_NAME = 'sth-gadgets-v1';
const PRECACHE_ASSETS = [
  '/',
  '/products',
  '/manifest.json',
  '/images/logo.png',
  '/images/logo-original.png',
];

// Install Event — Pre-cache critical core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Stale-While-Revalidate Strategy for fast offline browsing
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET requests or admin API POSTs
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip caching for Next.js hot module reloads & admin API requests
  if (url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/_next/webpack-hmr')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // If valid GET response, update cache in background
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed — fallback to cached version or home page shell
          return cachedResponse || caches.match('/') || Response.error();
        });

      return cachedResponse || fetchPromise;
    })
  );
});
