/**
 * FastReader - Service Worker
 * Handles offline caching and PWA functionality
 * 
 * 100% Open Source - MIT License
 */

const CACHE_NAME = 'fastreader-v3';
const CACHE_VERSION = 3;

// Assets to cache on install
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './pdf-loader.js',
    './manifest.json',
    './icons/favicon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './fonts/OpenDyslexic-Regular.otf',
    './lib/pdf.min.js',
    './lib/pdf.worker.min.js'
];

// External resources to cache on first use
const RUNTIME_CACHE_URLS = [
    'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/'
];

/**
 * Install event - precache assets
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching app shell');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                // Activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Precache failed:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('fastreader-') && name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                // Take control of all clients immediately
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - serve from cache with network fallback
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Handle different request types
    if (isAppShellRequest(url)) {
        // App shell: cache-first
        event.respondWith(cacheFirst(request));
    } else if (isExternalCdnRequest(url)) {
        // CDN resources: network-first with cache fallback
        event.respondWith(networkFirst(request));
    } else {
        // Everything else: network-first
        event.respondWith(networkFirst(request));
    }
});

/**
 * Check if request is for app shell assets
 */
function isAppShellRequest(url) {
    const pathname = url.pathname;
    const origin = url.origin;
    
    // Same origin requests
    if (origin === self.location.origin) {
        return PRECACHE_ASSETS.some((asset) => {
            const assetPath = asset.startsWith('./') ? asset.slice(1) : asset;
            return pathname === assetPath || pathname === '/' + assetPath;
        });
    }
    
    return false;
}

/**
 * Check if request is for external CDN resources
 */
function isExternalCdnRequest(url) {
    return RUNTIME_CACHE_URLS.some((cdnUrl) => url.href.startsWith(cdnUrl));
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('[SW] Cache-first failed:', error);
        
        // Return offline fallback for HTML
        if (request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('./index.html');
        }
        
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('[SW] Network-first falling back to cache:', error);
        
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback for HTML
        if (request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('./index.html');
        }
        
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * Stale-while-revalidate strategy (not used but available)
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    const networkResponsePromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    });

    return cachedResponse || networkResponsePromise;
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

/**
 * Handle background sync (for future use)
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-reading-progress') {
        event.waitUntil(syncReadingProgress());
    }
});

async function syncReadingProgress() {
    // Future: sync reading progress to server
    console.log('[SW] Syncing reading progress');
}

/**
 * Handle push notifications (for future use)
 */
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'FastReader', {
                body: data.body,
                icon: './icons/icon-192.png',
                badge: './icons/icon-192.png'
            })
        );
    }
});

console.log('[SW] Service Worker loaded');
