// ARISE PWA — Service Worker v2 (gestor de rutinas)
const CACHE_NAME = 'arise-cache-v2';

// Todos los recursos que se cachean al instalar
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // CDN externos (Tailwind, FontAwesome, Google Fonts)
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@400;600;800&family=Rajdhani:wght@600;700&display=swap'
];

// ── INSTALL: cachear todos los assets locales ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Los assets de CDN pueden fallar en modo cors, los cacheamos por separado
      const localAssets = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
      return cache.addAll(localAssets);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar caches viejos ───────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Network-first para CDN, Cache-first para locales ───────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Para recursos externos (CDN): intentar red, caer en caché
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Para recursos locales: caché primero, luego red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
