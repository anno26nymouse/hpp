// Service worker — Buku Kas Ikan Hias & Aquarium
// Strategi: stale-while-revalidate untuk file di origin sendiri (app shell),
// supaya halaman tetap bisa dibuka walau koneksi lagi jelek/offline.

const CACHE_NAME = 'buku-kas-ikan-v1';
const APP_SHELL = [
  './hpp.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
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
  // Request ke CDN eksternal (font, jsPDF, icon) dibiarkan lewat jalur normal browser.
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if(res && res.status === 200){
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
