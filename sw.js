/* Field Logbook service worker.
   Strategy: NETWORK-FIRST for the app shell (so re-uploaded index.html reaches
   phones automatically on next launch), falling back to cache when offline.
   Icons/manifest stay cache-first. Data sync is IndexedDB in the app. */
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
  const url = new URL(e.request.url);
  // API calls: never intercept.
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  const isShellPage = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
  if (isShellPage) {
    // Network-first: always try for the freshest app; cache is the offline net.
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    // Static assets: cache-first.
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});
