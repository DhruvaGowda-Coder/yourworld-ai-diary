const CACHE_NAME = 'yourworld-cache-v5';
const PRECACHE_ASSETS = [
  '/static/manifest.json',
  '/static/img/yourworld-symbol.svg',
  '/static/audio/campfire.wav',
  '/static/audio/water.wav',
  '/static/audio/wind.wav',
  '/static/audio/earth.wav',
  '/static/audio/ice.wav',
  '/static/audio/storm.wav',
  '/static/audio/space.wav',
  '/static/audio/garden.wav',
  '/static/audio/cherry.wav',
  'https://fonts.googleapis.com/css2?family=Spectral:wght@400;600;700&family=Space+Grotesk:wght@400;500;600&family=Noto+Serif:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API calls: network only (never cache)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML pages and JS/CSS: network-first, cache fallback
  // This ensures versioned assets are always fetched fresh
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Audio, images, fonts: cache-first (these rarely change)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline — no cached version available
      });
    })
  );
});
