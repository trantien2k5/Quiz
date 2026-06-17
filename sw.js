const CACHE = 'quiz-v70';
const STATIC = [
  './index.html',
  './css/base.css?v=70',
  './css/buttons.css?v=70',
  './css/forms.css?v=70',
  './css/components.css?v=70',
  './css/home.css?v=70',
  './css/editor.css?v=70',
  './css/quiz.css?v=70',
  './css/results.css?v=70',
  './css/history.css?v=70',
  './css/ai.css?v=70',
  './js/core/storage.js?v=70',
  './js/core/utils.js?v=70',
  './js/core/app.js?v=70',
  './js/home/home.js?v=70',
  './js/editor/editor.js?v=70',
  './js/quiz/quiz.js?v=70',
  './js/results/results.js?v=70',
  './js/library/library.js?v=70',
  './js/history/history.js?v=70',
  './js/ai/ai.js?v=70',
  './manifest.json',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
];

// Cài đặt: cache toàn bộ assets tĩnh
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// Kích hoạt: xoá cache cũ
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first cho HTML + version.json, cache-first cho assets tĩnh
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isNav = e.request.mode === 'navigate';
  const isVersion = url.pathname.endsWith('version.json');

  if (isNav || isVersion) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request)
          .then(r => r || caches.match('./index.html'))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
