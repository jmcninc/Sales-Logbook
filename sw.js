/* Field Logbook service worker — caches the app shell for offline launch.
   Data sync is handled separately in the app via IndexedDB, so this only
   needs the static files. Bump CACHE to force an update after edits. */
const CACHE = 'logbook-v1';
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
  // Never cache API calls to Apps Script — always go to network.
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  // App shell: cache-first, fall back to network.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
