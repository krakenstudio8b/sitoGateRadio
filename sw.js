// sw.js — Gate Radio Service Worker
// Strategie:
//   - Shell (HTML/CSS/JS locali): Cache First
//   - Font / CDN: Stale While Revalidate
//   - YouTube API / immagini esterne: Network First con fallback cache

const CACHE_NAME = 'gateradio-v1';

const SHELL = [
    '/',
    '/index.html',
    '/radio.html',
    '/css/style.css',
    '/js/config.js',
    '/js/radio.js',
    '/js/script.js',
    '/js/streams-data.js',
    '/manifest.json',
    '/logogate2.png',
];

// ── Install: precache shell ───────────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

// ── Activate: rimuove cache vecchie ─────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Richieste YouTube API e googleapis: Network First (no cache per dati live)
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        event.respondWith(fetch(request).catch(() => caches.match(request)));
        return;
    }

    // Font Google / CDN (Font Awesome, Tailwind): Stale While Revalidate
    if (url.hostname.includes('fonts.') || url.hostname.includes('cdnjs.') || url.hostname.includes('cdn.tailwindcss')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(request).then(cached => {
                    const networkFetch = fetch(request).then(res => {
                        if (res.ok) cache.put(request, res.clone());
                        return res;
                    });
                    return cached || networkFetch;
                })
            )
        );
        return;
    }

    // Shell locale: Cache First
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(res => {
                if (!res || res.status !== 200) return res;
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                return res;
            });
        })
    );
});
