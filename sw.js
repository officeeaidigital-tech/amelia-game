// Keeps the game on the device so it opens without internet.
const CACHE = 'amelia-game-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  // 'reload' skips the browser's HTTP cache, so a new version stores the new files, not stale copies.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !isFont) return;

  // Network first so updates arrive when online. For the game's own files, 'no-cache' asks the
  // server every time (GitHub Pages otherwise lets the browser reuse a copy for 10 minutes).
  // Offline, fall back to the saved copy.
  const fresh = sameOrigin ? fetch(url.href, { cache: 'no-cache' }) : fetch(e.request);
  e.respondWith(
    fresh
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
