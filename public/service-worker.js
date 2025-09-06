/**
 * public/service-worker.js
 * * This is the heart of the Progressive Web App (PWA). It runs in the background
 * to handle offline support and caching.
 *
 * Cache Strategy: "Cache-First" (for the App Shell)
 * 1. INSTALL: When the app is first visited, we "install" the service worker and cache all essential app files (the "app shell").
 * 2. ACTIVATE: We clean up any old, outdated caches.
 * 3. FETCH: When the browser requests any file (CSS, JS, images, or API data):
 * - We first check if we have a valid copy in our cache.
 * - If YES: We serve the file instantly from the cache (making the app load offline).
 * - If NO (or if it's an API request we don't cache): We try to fetch it from the network.
 * - We also add dynamic API data (like resources) to a separate cache as the user browses.
 */

const STATIC_CACHE_NAME = 'sahara-static-v1'; // For the app shell (HTML, CSS, JS)
const DYNAMIC_CACHE_NAME = 'sahara-dynamic-v1'; // For API data (resources, exercises)

// A list of all the core files that make the application run.
// This is the "App Shell" that will be cached on install.
const CORE_APP_SHELL = [
    '/index.html',
    '/styles.css',
    '/admin.css', // We cache this too, assuming it shares resources
    '/script.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', // Cache Font Awesome
    'https://cdn.jsdelivr.net/npm/chart.js' // Cache Chart.js
    // We add images/fonts here as well
];

// --- 1. INSTALL Event ---
// This runs only once when the browser first installs the service worker.
self.addEventListener('install', event => {
    console.log('[Service Worker] Install event...');
    // We "wait until" the cache is pre-filled before considering the install complete.
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-caching App Shell...');
                return cache.addAll(CORE_APP_SHELL);
            })
            .then(() => self.skipWaiting()) // Activate the new service worker immediately
    );
});

// --- 2. ACTIVATE Event ---
// This runs after install. Its job is to clean up old, outdated caches.
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate event...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // If the cache name isn't our current one, delete it.
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all open pages
    );
});

// --- 3. FETCH Event (The Core Logic) ---
// This runs EVERY TIME the app makes any network request (e.g., fetching a script, an image, or an API call).
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Strategy 1: API Data Caching (Cache then Network)
    // We cache read-only data like resources and exercises so they are available offline.
    if (requestUrl.pathname.startsWith('/api/resources') || requestUrl.pathname.startsWith('/api/exercises')) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    // Try the network first to get the freshest data
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        // If we get a good response, we update our cache
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    
                    // If we are offline, fetchPromise will fail, but if we have an old copy in the cache, return that instead.
                    return cachedResponse || fetchPromise;
                });
            })
        );
    }
    // Strategy 2: App Shell Caching (Cache-First)
    // For our core app files, we always serve the cached version first for instant loads.
    else if (CORE_APP_SHELL.includes(requestUrl.pathname) || event.request.destination === 'font') {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                // If we have it in the cache, return it.
                // Otherwise, fetch it (this might happen if Font Awesome requests a font file not in our list)
                return cachedResponse || fetch(event.request).then(response => {
                    // Also add this new request to our cache for next time
                    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
    }
    // Default: For everything else (like chat messages, booking POST requests),
    // just use the network as normal. We don't want to cache sensitive or transactional data.
    else {
        event.respondWith(fetch(event.request));
    }
});