/* OMNIA Business Management System — Service Worker
   Strategy: NETWORK-FIRST for everything.
   The app's data lives in Supabase (live), so we never serve stale data.
   The cache is only a fallback so the shell still opens if the network blips.
   Bump CACHE_VERSION whenever you want to force-refresh cached shell files. */
const CACHE_VERSION = 'omnia-v1';
const SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL).catch(() => {}))
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first, fall back to cache only if offline
self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Never touch Supabase / API / non-GET — always go to network
  if (req.method !== 'GET' ||
      req.url.includes('supabase.co') ||
      req.url.includes('/auth/') ||
      req.url.includes('/rest/') ||
      req.url.includes('/realtime')) {
    return; // let the browser handle it normally
  }
  e.respondWith(
    fetch(req)
      .then((res) => {
        // cache a fresh copy of shell-type GET responses
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy).catch(() => {}));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
