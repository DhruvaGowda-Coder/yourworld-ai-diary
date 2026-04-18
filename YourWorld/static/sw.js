const CACHE_NAME = 'yourworld-cache-v2';
const ASSETS = [
  '/static/css/styles.css',
  '/static/js/app.js',
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
      return cache.addAll(ASSETS);
    })
  );
  // Activate new SW immediately instead of waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete old caches when a new SW activates
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // HTML pages & API calls: always go network-first
  // (so server-injected config like Firebase is always fresh)
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache new static assets for next time
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Handle offline fallback gracefully if needed
      });
    })
  );
});
