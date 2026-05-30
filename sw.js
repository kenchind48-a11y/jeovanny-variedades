const CACHE_NAME = 'jeovanny-variedades-v1';
const OFFLINE_FALLBACK = '/index.html';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/pages/admin.html',
    '/pages/chat.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/app.js',
    '/js/admin.js',
    '/js/chat.js',
    '/js/storage.js',
    '/img/logo.png',
    '/img/icons/icon-192.png',
    '/img/icons/icon-512.png',
    '/img/icons/favicon.png',
    '/img/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request)
                .then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    return networkResponse;
                })
                .catch(() => caches.match(OFFLINE_FALLBACK));
        })
    );
});
