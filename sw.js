// Service worker — Buku Kas Ikan Hias & Aquarium
// Strategi: stale-while-revalidate untuk file di origin sendiri (app shell),
// supaya halaman tetap bisa dibuka walau koneksi lagi jelek/offline.

const CACHE_NAME = 'buku-kas-ikan-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // Cache tiap file satu-satu (bukan addAll) supaya 1 file gagal
        // tidak bikin instalasi service worker gagal total.
        const results = await Promise.allSettled(
          APP_SHELL.map((url) => cache.add(url))
        );
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.warn('[sw] gagal cache saat install:', APP_SHELL[i], r.reason);
          }
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani request GET dari origin sendiri.
  // Request ke CDN eksternal (font, jsPDF) dibiarkan lewat jalur normal browser.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
