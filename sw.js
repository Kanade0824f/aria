/**
 * aria. — Service Worker
 * Handles offline caching and resource management
 */

const CACHE_NAME = 'aria-v1';

// App shell resources (local)
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/assets/icon.svg',
  '/manifest.json'
];

// CDN resources to cache
const CDN_RESOURCES = [
  // Marked (Markdown parser)
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  // KaTeX (Math rendering)
  'https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js',
  // highlight.js (Code syntax highlighting)
  'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/highlight.min.js',
  'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/styles/github.min.css',
  'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/styles/github-dark.min.css'
];

// Google Fonts URLs (cached on first request)
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

/**
 * Install event — cache app shell and CDN resources
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache app shell first (critical)
      const appShellPromise = cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Failed to cache some app shell resources:', err);
      });

      // Cache CDN resources (non-blocking)
      const cdnPromise = Promise.allSettled(
        CDN_RESOURCES.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache CDN resource: ${url}`, err);
          })
        )
      );

      return Promise.all([appShellPromise, cdnPromise]);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

/**
 * Activate event — clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

/**
 * Fetch event — routing strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for GitHub API calls
  if (url.hostname === 'api.github.com') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for Google Fonts
  if (FONT_ORIGINS.some((origin) => request.url.startsWith(origin))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Cache-first for CDN resources
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Cache-first for local static assets
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for navigation (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default: cache-first
  event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy
 * Try cache, fall back to network, cache the response
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineFallback(request);
  }
}

/**
 * Network-first strategy
 * Try network, cache successful responses, fall back to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return offlineFallback(request);
  }
}

/**
 * Offline fallback response
 */
function offlineFallback(request) {
  // For navigation requests, return cached index
  if (request.mode === 'navigate') {
    return caches.match('/index.html');
  }

  // For API requests, return a JSON error
  if (new URL(request.url).hostname === 'api.github.com') {
    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are currently offline.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Generic offline response
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}
