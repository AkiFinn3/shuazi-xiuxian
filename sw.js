/* Service Worker：让游戏可以「添加到主屏幕」并离线玩 */
const VERSION = 'shuazi-xiuxian-v4';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/data/config.js',
  './js/data/sprites.js',
  './js/game/spirit_root.js',
  './js/ui/screens.js',
  './js/ui/nav.js',
  './js/ui/roots.js',
  './js/ui/farm.js',
  './assets/fonts/noto-serif-sc-regular.woff2',
  './assets/fonts/noto-serif-sc-semibold.woff2',
  './assets/hd/landscape-qinglu.webp',
  './assets/icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 页面与代码：优先网络（保证更新生效），失败回落缓存
  if (req.mode === 'navigate' || /\.(?:js|css|html|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // 图片与字体：缓存优先
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
