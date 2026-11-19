/**
 * aria. — Service Worker
 * Cache strategy: network-first for app shell (always get latest JS/CSS),
 * cache-first for CDN + fonts (stable external resources).
 *
 * Version is injected at deploy time via GitHub Actions, or falls back to
 * a timestamp so local dev always gets a fresh cache.
 */

const CACHE_VERSION = '__ARIA_SW_VERSION__';  // replaced by CI; fallback below
const CACHE_NAME = 'aria-' + (CACHE_VERSION === '__ARIA_SW_VERSION__'
  ? Date.now()          // local dev: always fresh
  : CACHE_VERSION);     // production: stable across tabs

const CDN_ORIGINS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: pre-cache CDN only (app shell fetched network-first) ────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  // No pre-caching of app shell — network-first handles it
});

// ── Activate: delete ALL old caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch routing ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // GitHub API — always network, no cache
  if (url.hostname === 'api.github.com') {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: 'offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // CDN + fonts — cache-first (they're content-addressed / versioned URLs)
  if (CDN_ORIGINS.includes(url.hostname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App shell (HTML, JS, CSS, assets) — NETWORK-FIRST so updates land immediately
  event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(CACHE_NAME)).put(request, res.clone());
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(CACHE_NAME)).put(request, res.clone());
    return res;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
