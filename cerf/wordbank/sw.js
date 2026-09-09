/* Wordbank service worker — offline app shell + on-demand dictionary cache.

   Two independently versioned caches:

   - VERSION covers the app shell. Bump it for any HTML/CSS/JS change.
   - DATA covers data/dict.json, which is cached cache-first and never
     revalidated, so an installed copy would otherwise serve the old file
     forever. Bump it ONLY when dict.json actually changes — it is 2.5 MB over
     the wire, and tying it to VERSION made every code change re-download the
     whole dictionary.

   The activate handler deletes any cache that is neither of these.

   shell v2 — phrase index; v3 — phrase supplement; v4 — more supplement
   entries; v5 — new words hide their gloss until the learner self-assesses.
   data  v4 — 52,061 phrases (name frozen so the v5 shell keeps the cached copy). */
const VERSION = 'wb-v5';
const SHELL = VERSION + '-shell';
const DATA = 'wb-v4-data';

// Everything needed to boot with no network. dict.json is deliberately NOT here:
// it is 3 MB and only fetched the first time the user actually needs a lookup.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/store.js',
  './js/srs.js',
  './js/dict.js',
  './js/parse.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      // addAll is all-or-nothing; one 404 would leave the app with no cache at all
      .then(c => Promise.allSettled(SHELL_FILES.map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Dictionary: cache-first and never revalidated — the file is content-stable.
  if (url.pathname.endsWith('/data/dict.json')) {
    e.respondWith(
      caches.open(DATA).then(c => c.match(req).then(hit =>
        hit || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; })
      ))
    );
    return;
  }

  // App shell: serve from cache immediately, refresh in the background.
  e.respondWith(
    caches.open(SHELL).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; })
        .catch(() => hit || caches.match('./index.html'));
      return hit || net;
    }))
  );
});
