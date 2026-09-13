'use strict';

/* Quran Kareem Direct — Service Worker v5.6 (r24: PageSpeed follow-up #3 — the real
   root cause of the intermittent "Error! NO_LCP" seen across all 3 reports. Fixed in
   index.html, not here, but bumping the cache buster since it's a real behavioral fix
   that must reach every visitor: clients.claim() in this file's activate handler
   (kept below, still correct/needed) fires controllerchange even on a client's very
   FIRST-ever activation (no prior controller) — index.html's naive reload-on-
   controllerchange was treating that first activation as "an update happened,
   reload", forcing an unnecessary full-page reload on every first-time visitor mid-
   load. That's what was racing against and sometimes breaking Lighthouse's LCP/TBT
   trace, and would be a jarring reload for real first-time users too. index.html now
   tracks whether a controller already existed before registration and only reloads
   on a genuine subsequent update. Cache buster bump only — لا علاقة له برقم إصدار
   التطبيق الظاهر للمستخدم.) */
const CACHE_S = 'quran-static-v5-r24';
const CACHE_P = 'quran-pages-v5-r24';

const PRECACHE = [
  './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png',
  './favicon-16.png', './favicon-32.png', './favicon-48.png',
  './audio/takbeer.mp3',
  './vendor/adhan.umd.min.js'
  /* ملاحظة: vendor/hls.min.js مقصود استبعاده من التخزين المسبق الإلزامي —
     413KB لا يستحق تحميلها لكل زائر؛ يُخزَّن تلقائيًا بواسطة CACHE_S العادي
     في أول مرة يُطلَب فيها فعليًا (أول تشغيل لإذاعة HLS)، فيتوفر بعدها بلا
     إنترنت أيضًا دون فرضه على كل من لم يشغّل الراديو أصلًا */
];

const PAGES = ['./', './index.html', './manifest.json', './offline.html'];

const ASSETS = [
  './css/styles.min.css',
  './js/app.js', './js/locationService.js', './js/qiblaService.js', './js/qiblaUI.js',
  './js/prayerService.js', './js/ui.js',
  './js/ui-enhancements.js', './js/pwa-install.js',
  './js/recitationService.js', './js/recitationUI.js',
  './vendor/adhan.umd.min.js'
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
    event.respondWith(networkFirst(event.request, CACHE_S));
    return;
  }

  event.respondWith(cacheFirst(event.request, CACHE_S));
});

async function networkFirst(request, cacheName, timeoutMs = 1800) {
  /* v29: سباق بمهلة — لو الشبكة بطيئة (مش معطوبة تمامًا)، منستنّاش أكتر من
     المهلة المحددة قبل ما نرجّع أي نسخة مخزّنة صالحة فورًا؛ الطلب الشبكي
     يكمل في الخلفية ويحدّث الكاش لأي زيارة تالية. بيحافظ على قصد "الأحدث
     دايمًا" بدون ما يوقّف عرض الصفحة على اتصال بطيء.
     v20-review: fetch مع {cache:'no-cache'} — يجبر الشبكة على *مراجعة*
     الخادم دائمًا (conditional request بـETag/Last-Modified) بدل ما يقبل
     نسخة من الـHTTP disk cache للمتصفح بلا أي اتصال فعلي بالسيرفر. ده هو
     السبب الحقيقي لمشكلة "التصفح المتخفي يعرض نسخة جديدة والعادي يعرض
     نسخة قديمة": صفحات GitHub Pages بتُخزَّن بـETag قوي، والمتصفح العادي
     ممكن يشبع طلب fetch() بالكامل من القرص دون أي طلب شبكي حقيقي، فتفشل
     استراتيجية networkFirst في تحقيق قصدها الأساسي. no-cache (مش
     no-store) مقصودة: تضمن نفس الأمان (مراجعة فعلية مع الخادم في كل مرة)
     لكن تسمح برد 304 خفيف عند عدم التغيير بدل تنزيل الملف كاملًا من
     الصفر في كل تحميل صفحة — أوفر بيانات وأسرع من no-store دون أي تضحية
     في الصحة. */
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(new Request(request, { cache: 'no-cache' })).then((response) => {
    if (response?.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  if (cached) {
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const winner = await Promise.race([networkPromise, timeout]);
    if (winner) return winner;
    networkPromise.then((fresh) => { /* استمرار التحديث في الخلفية حتى لو فاتته المهلة */ if (fresh) return fresh; });
    return cached;
  }

  const response = await networkPromise;
  if (response) return response;
  const offlinePage = await caches.match('./offline.html');
  if (offlinePage) return offlinePage;
  return new Response('<h1 dir="rtl">غير متصل</h1>', {
    headers: { 'Content-Type': 'text/html;charset=utf-8' }
  });
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
