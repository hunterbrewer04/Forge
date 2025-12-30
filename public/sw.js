const CACHE_VERSION = 'v3';
const STATIC_CACHE = `forge-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `forge-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `forge-images-${CACHE_VERSION}`;

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/home',
  '/chat',
  '/schedule',
  '/profile',
  '/login',
  '/signup',
  '/manifest.json',
  '/offline.html'
];

// Navigation routes for stale-while-revalidate
const NAV_ROUTES = ['/home', '/chat', '/schedule', '/profile', '/stats'];

// Cache limits
const DYNAMIC_CACHE_LIMIT = 50;
const IMAGE_CACHE_LIMIT = 100;

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete caches that don't match current version
            return name.startsWith('forge-') &&
                   !name.endsWith(CACHE_VERSION);
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event with multiple caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls - let them go to network
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Skip local API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Strategy 1: Cache-first for static assets (JS, CSS, fonts)
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font' ||
      url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Strategy 2: Stale-while-revalidate for images
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, clone);
              limitCacheSize(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
            });
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Strategy 3: Stale-while-revalidate for navigation routes
  if (request.mode === 'navigate' || NAV_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clone);
              limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
            });
          }
          return response;
        }).catch(() => {
          // Network failed, return cached or offline page
          return cached || caches.match('/offline.html');
        });

        // Return cached immediately, update in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Strategy 4: Network-first for everything else
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, clone);
          limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(request).then((cached) => {
        return cached || caches.match('/offline.html');
      });
    })
  );
});
