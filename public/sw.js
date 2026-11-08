// ─────────────────────────────────────────────────────────────
// MyFitAI — Offline Gym Service Worker (v2)
// High-performance offline caching for exercise demonstrations,
// app shell, navigation fallbacks, and zero-connectivity resilience.
// ─────────────────────────────────────────────────────────────

const CACHE_NAMES = {
  core: 'myfitai-core-v2',
  assets: 'myfitai-assets-v2',
  media: 'myfitai-exercise-media-v2',
  fonts: 'myfitai-fonts-v2',
};

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/brand/myfitai-icon-512.png',
  '/icons.svg',
  '/ai_gym_placeholder.png',
];

// Fallback SVG image when exercise media is requested offline and not yet cached
const OFFLINE_MEDIA_FALLBACK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">
  <rect width="400" height="300" fill="#0D0D0E"/>
  <rect x="1" y="1" width="398" height="298" rx="16" stroke="#2A2A2D" stroke-width="2"/>
  <circle cx="200" cy="130" r="36" fill="#1E1E20" stroke="#FF5722" stroke-width="2"/>
  <path d="M188 122v16M212 122v16M184 130h32" stroke="#FF5722" stroke-width="3" stroke-linecap="round"/>
  <text x="200" y="195" font-family="-apple-system, sans-serif" font-size="14" font-weight="bold" fill="#F5F5F7" text-anchor="middle">OFFLINE GYM MODE</text>
  <text x="200" y="218" font-family="-apple-system, sans-serif" font-size="11" fill="#7A7A85" text-anchor="middle">Demonstration available once reconnected</text>
</svg>
`.trim();

// ─── Install Lifecycle ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.core).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Core assets pre-caching partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate Lifecycle (Cache Pruning) ──────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = Object.values(CACHE_NAMES);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!currentCaches.includes(key)) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Helper Matchers ─────────────────────────────────────────
function isExerciseMediaUrl(url) {
  return (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('openfoodfacts.org') ||
    url.hostname.includes('img.youtube.com') ||
    url.pathname.match(/\.(gif|jpg|jpeg|png|webp|svg)$/i) !== null
  );
}

function isFontUrl(url) {
  return (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  );
}

function isStaticAssetUrl(url) {
  return url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
}

// ─── Fetch Handling ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests or browser extension protocols
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) return;

  const url = new URL(request.url);

  // 1. Navigation Requests (SPA Routing Fallback for Gym Basements)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAMES.core).then((cache) => cache.put('/index.html', responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback immediately to cached index.html so client routes boot offline
          return caches.match('/index.html').then((cached) => {
            if (cached) return cached;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 2. Exercise Demonstrations & Biomechanical Media (Cache-First)
  if (isExerciseMediaUrl(url)) {
    event.respondWith(
      caches.open(CACHE_NAMES.media).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((networkResponse) => {
              // Cache valid responses (including opaque CORS responses for CDNs)
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // If offline and request is an image, serve our offline SVG fallback
              return new Response(OFFLINE_MEDIA_FALLBACK_SVG, {
                headers: {
                  'Content-Type': 'image/svg+xml',
                  'Cache-Control': 'no-store',
                },
              });
            });
        });
      })
    );
    return;
  }

  // 3. Web Fonts (Stale-While-Revalidate)
  if (isFontUrl(url)) {
    event.respondWith(
      caches.open(CACHE_NAMES.fonts).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. Static JS/CSS Assets (Stale-While-Revalidate)
  if (isStaticAssetUrl(url)) {
    event.respondWith(
      caches.open(CACHE_NAMES.assets).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 5. Default Cache-first for core assets (icons, manifest)
  if (CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

// ─── Messaging API (Pre-Caching & Diagnostics) ───────────────
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Pre-cache an array of exercise demonstration URLs for offline gym usage
  if (data.type === 'PRELOAD_MEDIA' && Array.isArray(data.urls)) {
    const urls = data.urls.filter((u) => typeof u === 'string' && u.startsWith('http'));
    let loaded = 0;
    const total = urls.length;

    caches.open(CACHE_NAMES.media).then(async (cache) => {
      for (const url of urls) {
        try {
          const match = await cache.match(url);
          if (!match) {
            const resp = await fetch(url, { mode: 'cors' });
            if (resp && (resp.status === 200 || resp.type === 'opaque')) {
              await cache.put(url, resp);
            }
          }
        } catch {
          // Skip network error for single asset
        }
        loaded++;
        // Broadcast progress back to active tabs
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'PRELOAD_PROGRESS',
            loaded,
            total,
            url,
          });
        });
      }

      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'PRELOAD_COMPLETE',
          loaded,
          total,
        });
      });
    });
    return;
  }

  // Diagnostic Stats
  if (data.type === 'GET_CACHE_STATS') {
    Promise.all([
      caches.open(CACHE_NAMES.core).then((c) => c.keys()),
      caches.open(CACHE_NAMES.assets).then((c) => c.keys()),
      caches.open(CACHE_NAMES.media).then((c) => c.keys()),
    ]).then(([coreKeys, assetKeys, mediaKeys]) => {
      event.source?.postMessage({
        type: 'CACHE_STATS',
        stats: {
          core: coreKeys.length,
          assets: assetKeys.length,
          media: mediaKeys.length,
        },
      });
    });
    return;
  }

  // Clear media cache to release storage
  if (data.type === 'PURGE_MEDIA_CACHE') {
    caches.delete(CACHE_NAMES.media).then(() => {
      event.source?.postMessage({ type: 'MEDIA_CACHE_PURGED' });
    });
  }
});
