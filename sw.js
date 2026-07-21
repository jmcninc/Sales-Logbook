/* Field Logbook service worker — caches the app shell for offline launch.
   Data sync is handled separately in the app via IndexedDB, so this only
   needs the static files.

   HTML is served network-first so a fresh deploy shows up on the next online
   launch without anyone clearing caches; the cached copy is only the offline
   fallback. Other static assets stay cache-first for speed. Bump CACHE on
   deploys to proactively drop the old cache. */
const CACHE = 'logbook-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Never cache API calls to Apps Script — always go to network.
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // App shell (HTML navigations + index.html): network-first so updates land
  // on the next online launch; fall back to cache when offline.
  const isShell = e.request.mode === 'navigate' ||
                  url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (isShell) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Other static assets: cache-first, fall back to network.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
