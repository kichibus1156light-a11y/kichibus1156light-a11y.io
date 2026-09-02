const CACHE = 'colony-drop-mobile-v2';
const CORE = [
  './', './index.html', './css/style.css', './js/data.js', './js/scene.js',
  './js/camera.js', './js/audio.js', './js/ui.js', './js/main.js',
  './vendor/fontawesome-all.min.css',
  './images/earth-blue-marble.jpg', './images/earth-topology.png',
  './images/earth-water.png', './images/night-sky.png'
];
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(CORE);
    try { await cache.add(CDN); } catch (_) {}
    self.skipWaiting();
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && (response.ok || response.type === 'opaque')) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match('./index.html'));
  }));
});
