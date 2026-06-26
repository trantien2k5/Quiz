const CACHE = 'quiz-v120';
const STATIC = [
  './index.html',
  './css/base/tokens.css?v=120',
  './css/base/reset.css?v=120',
  './css/layout/shell.css?v=120',
  './css/layout/nav.css?v=120',
  './css/components/button.css?v=120',
  './css/components/form.css?v=120',
  './css/components/toggle.css?v=120',
  './css/components/badge.css?v=120',
  './css/components/modal.css?v=120',
  './css/components/toast.css?v=120',
  './css/components/update-banner.css?v=120',
  './css/components/fab.css?v=120',
  './css/components/card.css?v=120',
  './css/components/section-label.css?v=120',
  './css/components/drop-zone.css?v=120',
  './css/components/settings-row.css?v=120',
  './css/pages/home.css?v=120',
  './css/pages/editor.css?v=120',
  './css/pages/quiz.css?v=120',
  './css/pages/results.css?v=120',
  './css/pages/history.css?v=120',
  './css/pages/ai.css?v=120',
  './css/pages/import.css?v=120',
  './css/utilities/utilities.css?v=120',
  './css/utilities/animations.css?v=120',
  './js/core/storage.js?v=120',
  './js/core/utils.js?v=120',
  './js/core/activity-tracker.js?v=120',
  './js/core/app.js?v=120',
  './js/home.js?v=120',
  './js/editor.js?v=120',
  './js/quiz.js?v=120',
  './js/results.js?v=120',
  './js/library.js?v=120',
  './js/history.js?v=120',
  './js/ai.js?v=120',
  './js/import-text.js?v=120',
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
