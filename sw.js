const CACHE = 'quiz-v122';
const STATIC = [
  './index.html',
  './src/shared/styles/base/tokens.css?v=122',
  './src/shared/styles/base/reset.css?v=122',
  './src/shared/styles/layout/shell.css?v=122',
  './src/shared/styles/layout/nav.css?v=122',
  './src/shared/styles/components/button.css?v=122',
  './src/shared/styles/components/form.css?v=122',
  './src/shared/styles/components/toggle.css?v=122',
  './src/shared/styles/components/badge.css?v=122',
  './src/shared/styles/components/modal.css?v=122',
  './src/shared/styles/components/toast.css?v=122',
  './src/shared/styles/components/update-banner.css?v=122',
  './src/shared/styles/components/fab.css?v=122',
  './src/shared/styles/components/card.css?v=122',
  './src/shared/styles/components/section-label.css?v=122',
  './src/shared/styles/components/drop-zone.css?v=122',
  './src/shared/styles/components/settings-row.css?v=122',
  './src/features/home/home.css?v=122',
  './src/features/editor/editor.css?v=122',
  './src/features/quiz/quiz.css?v=122',
  './src/features/results/results.css?v=122',
  './src/features/history/history.css?v=122',
  './src/features/ai/ai.css?v=122',
  './src/features/import-text/import.css?v=122',
  './src/shared/styles/utilities/utilities.css?v=122',
  './src/shared/styles/utilities/animations.css?v=122',
  './src/core/storage.js?v=122',
  './src/core/utils.js?v=122',
  './src/core/activity-tracker.js?v=122',
  './src/core/app.js?v=122',
  './src/features/home/home.js?v=122',
  './src/features/editor/editor.js?v=122',
  './src/features/quiz/quiz.js?v=122',
  './src/features/results/results.js?v=122',
  './src/features/library/library.js?v=122',
  './src/features/history/history.js?v=122',
  './src/features/ai/ai.js?v=122',
  './src/features/import-text/import-text.js?v=122',
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
