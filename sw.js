// このService Workerは以下の2つを行います。
// (1) アプリ本体(HTML/CSS/JS)をキャッシュし、2回目以降のアクセスをオフラインでも可能にする
// (2) Google Fontsから読み込んだフォントファイルを一度キャッシュしておき、
//     以降はオフラインでもそのキャッシュから読み込めるようにする
//     (フォントの表示内容そのものは外部に送信されません。読み込み専用のキャッシュです)
//
// 注意: このファイル(sw.js)は、js/フォルダの中ではなく必ずサイトのルート直下に
// 置いてください。Service Workerの制御範囲(scope)は、既定でこのファイル自身が
// 置かれている場所と、それより下の階層に限られます。js/フォルダの中に置いてしまうと、
// ルート直下の index.html / print.html / manual.html がこのService Workerの制御対象
// 外になり、オフライン対応が効かなくなります。

const CACHE_NAME = 'studyprint-v21';
const FONT_CACHE_NAME = 'studyprint-fonts-v1';

const ASSETS = [
  './',
  './index.html',
  './print.html',
  './manual.html',
  './css/style.css',
  './js/shared.js',
  './js/i18n.js',
  './js/i18n-data.js',
  './js/app.js',
  './js/print.js',
  './js/manual.js',
  './manifest.json',
  './icon.svg',
  './icons/favicon-16.png',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== FONT_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Google Fonts: 一度取得したら専用キャッシュに保存し、以降はそこから読む(cache-first)
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // アプリ本体(同一オリジン): キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
