'use strict';

/* Quran Kareem Direct — Service Worker v5.2 (QA pass 2: internal cache buster
   bumped only — لا علاقة له برقم إصدار التطبيق الظاهر للمستخدم. ضروري هذه المرة
   تحديدًا لأنه يحمل إصلاح خطأ توقيت الصلاة الجذري (فارق ساعات كامل) + إزالة قسم
   الخصوصية من الفوتر — يجب وصوله فعليًا لكل المستخدمين الحاليين فورًا) */
const CACHE_S = 'quran-static-v5-r3';
const CACHE_P = 'quran-pages-v5-r3';

const PRECACHE = [
  './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png',
  './audio/takbeer.mp3'
];

const PAGES = ['./', './index.html', './manifest.json', './offline.html'];

const ASSETS = [
  './css/styles.min.css',
  './js/app.js', './js/locationService.js', './js/prayerService.js', './js/ui.js',
  './js/ui-enhancements.js', './js/pwa-install.js',
  './js/recitationService.js', './js/recitationUI.js'
];

const BYPASS = [
  'radiojar.com', 'qurango.net', 'holol.com', 'itworkscdn.net',
  'jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'ipapi.co', 'ipwho.is', 'ip-api.com', 'nominatim.openstreetmap.org',
  'api.aladhan.com', 'mp3quran.net'
];

function bypass(url) {
  try {
    const u = new URL(url);
    if (BYPASS.some((host) => u.hostname.includes(host))) return true;
    if (['.m3u8', '.aac', '.ts'].some((ext) => u.pathname.endsWith(ext))) return true;
    if (u.pathname.endsWith('.mp3') && !u.pathname.includes('takbeer')) return true;
    return false;
  } catch (_) { return true; }
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE_S).then((cache) =>
      cache.addAll(PRECACHE).catch(() => {})
    ),
    caches.open(CACHE_S).then((cache) => Promise.all(
      ASSETS.map((url) => fetch(url).then((res) => {
        if (res.ok) return cache.put(url, res);
      }).catch(() => {}))
    )),
    caches.open(CACHE_P).then((cache) => Promise.all(
      PAGES.map((url) => fetch(url).then((res) => {
        if (res.ok) return cache.put(url, res);
      }).catch(() => {}))
    ))
  ]));
});

self.addEventListener('activate', (event) => {
  const valid = [CACHE_S, CACHE_P];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !valid.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || bypass(event.request.url)) return;

  let url;
  try { url = new URL(event.request.url); } catch (_) { return; }

  const path = url.pathname;
  const isPage = path.endsWith('/') || path.endsWith('.html') || path.endsWith('manifest.json');
  const isAsset = ASSETS.some((asset) => event.request.url.includes(asset.replace('./', '')));

  if (isPage) {
    event.respondWith(networkFirst(event.request, CACHE_P));
    return;
  }

  if (isAsset) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_S));
    return;
  }

  event.respondWith(cacheFirst(event.request, CACHE_S));
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const clone = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    /* v5: offline.html كان مُخزَّنًا مسبقًا (PAGES) لكنه لم يُستخدَم أبدًا فعليًا —
       كان يُعاد نص HTML مُضمَّن بسيط بدلًا منه. الآن يُقدَّم فعليًا عند فشل الشبكة والكاش معًا. */
    const offlinePage = await caches.match('./offline.html');
    if (offlinePage) return offlinePage;
    return new Response('<h1 dir="rtl">غير متصل</h1>', {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request).then((response) => {
    if (response?.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || fresh;
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response?.ok && response.type !== 'opaque') {
      caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
    }
    return response;
  } catch (_) {
    return new Response('', { status: 503 });
  }
}
