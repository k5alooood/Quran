'use strict';

const LocationService = (() => {
  const CACHE_KEY = 'qr_location_v3';
  const CACHE_TTL = 6 * 60 * 60 * 1000;

  /* تحقق صارم من الموقع المخزَّن: أنواع/نطاقات صحيحة وإلا يُعدّ الكاش غير موجود (فيُعاد الكشف) */
  const sanitizeLocation = d => {
    if (!d || typeof d !== 'object') return null;
    const { lat, lon } = d;
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
    const out = {
      lat, lon,
      city: str(d.city, 80),
      country: str(d.country, 80),
      countryCode: /^[A-Za-z]{2}$/.test(d.countryCode) ? d.countryCode.toUpperCase() : '',
      timezone: typeof d.timezone === 'string' && /^[A-Za-z0-9_+\-/]{1,64}$/.test(d.timezone) ? d.timezone : 'UTC',
      src: d.src === 'gps' || d.src === 'fallback' ? d.src : 'ip',
    };
    if (typeof d.accuracy === 'number' && Number.isFinite(d.accuracy)) out.accuracy = d.accuracy;
    return out;
  };

  const getCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.ts !== 'number' || Date.now() - obj.ts > CACHE_TTL) return null;
      return sanitizeLocation(obj.data);
    } catch { return null; }
  };

  const setCache = data => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
  };

  const ARABIC_CITY_LOOKUP = true;

  // Timeout-safe fetch (compatible with all browsers)
  const fetchWithTimeout = (url, opts, ms) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal })
      .finally(() => clearTimeout(timer));
  };

  const fromGPS = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => reject(err),
      /* timeout رُفع إلى 10000ms — GPS الداخلي والأجهزة البطيئة تحتاج وقتاً أطول */
      { timeout: 10000, maximumAge: 300000 }
    );
  });

  const reverseGeocode = async (lat, lon, ms = 6000) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ar,en`;
    const r = await fetchWithTimeout(url, { headers: { 'User-Agent': 'QuranLive/3.0' } }, ms);
    if (!r.ok) throw new Error('nominatim_fail');
    const d = await r.json();
    return {
      city: d.address?.city || d.address?.town || d.address?.village || d.address?.county || '',
      country: d.address?.country || '',
      countryCode: (d.address?.country_code || '').toUpperCase(),
    };
  };

  const fromIP = async () => {
    /* v5.7 (PageSpeed review #4): errors-in-console رصد فشل حقيقي —
       "ipapi.co/json/: 429 Too Many Requests". السلسلة هنا أصلًا مصمَّمة للتعافي
       التلقائي (لو مصدر فشل تجرّب التالي)، لكن رسالة "Failed to load resource"
       بتاعة المتصفح نفسه بتتسجّل في الـconsole بمجرد رجوع أي حالة HTTP فاشلة —
       سواء كودنا تعافى منها بعد كده ولا لأ، ومفيش أي try/catch في JS يقدر يمنع
       المتصفح من تسجيلها. يعني الحل الوحيد الحقيقي هو تقليل احتمال إن أول محاولة
       تفشل من الأساس، مش معالجة الفشل بعد ما يحصل. ipapi.co تحديدًا معروف بحد
       طلبات صارم على الخطة المجانية غير الموثَّقة بيتفعّل بسرعة مع أي عنوان IP
       مشترك (زي بنية اختبار PageSpeed نفسها، أو أي حركة زوار مكثّفة) — نزّلته من
       أول محاولة لتالت واحدة، وقدّمت ipwho.is (بلا حد معروف بنفس الصرامة) كأول
       محاولة بدلًا منه. */
    const endpoints = [
      { url: 'https://ipwho.is/',      map: d => ({ lat: d.latitude, lon: d.longitude, city: d.city, country: d.country, cc: d.country_code, tz: d.timezone }) },
      { url: 'https://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon,timezone', map: d => ({ lat: d.lat, lon: d.lon, city: d.city, country: d.country, cc: d.countryCode, tz: d.timezone }) },
      { url: 'https://ipapi.co/json/', map: d => ({ lat: d.latitude, lon: d.longitude, city: d.city, country: d.country_name, cc: d.country_code, tz: d.timezone }) },
    ];
    for (const ep of endpoints) {
      try {
        const r = await fetchWithTimeout(ep.url, {}, 5000);
        /* ad-blockers قد تُرجع 200 OK مع صفحة HTML — نتحقق من Content-Type */
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || !ct.includes('application/json')) continue;
        const d = await r.json();
        const m = ep.map(d);
        /* تحقق مزدوج: lat/lon يجب أن تكون أرقاماً منطقية */
        if (!Number.isFinite(parseFloat(m.lat)) || !Number.isFinite(parseFloat(m.lon))) continue;
        return {
          lat: parseFloat(m.lat), lon: parseFloat(m.lon),
          city: m.city || '',
          country: m.country || '',
          countryCode: (m.cc || '').toUpperCase(),
          timezone: m.tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
          src: 'ip',
        };
      } catch { /* ad-blocker أو شبكة — جرّب الـ endpoint التالي */ }
    }
    throw new Error('ip_all_failed');
  };

  /* v5.4 (PageSpeed review): فصل "تجاوز الكاش" (forceRefresh) عن "الإذن بطلب GPS"
     (allowGPS) — دي كانت نفس المتغيّر غلط، فكان أي تحديث تلقائي (فتح الصفحة أول
     مرة، أو إعادة الحساب التلقائية بعد كل أذان) بيحاول GPS الأول ويطلع نافذة إذن
     الموقع من المتصفح بدون أي ضغطة من المستخدم — وده بالظبط اللي رصدته PageSpeed
     Insights (geolocation-on-start). allowGPS الافتراضي false: يعني المسار الصامت
     (تحميل الصفحة، إعادة الحساب الدورية) يعتمد على IP فقط من غير أي نافذة إذن.
     GPS (اللي فعلاً بيطلع نافذة الإذن) بقى مربوط فقط بالأماكن اللي فيها ضغطة
     مستخدم حقيقية (زر "تحديث الموقع" أو "إعادة المحاولة" في ui.js). */
  const detect = async (forceRefresh = false, allowGPS = false) => {
    if (!forceRefresh) {
      const hit = getCache();
      if (hit) return hit;
    }

    let result;

    // 1. Try GPS + reverse geocode — فقط لو المستخدم ضغط فعليًا على زر يطلب دقة أعلى
    if (allowGPS) {
      try {
        const { lat, lon, accuracy } = await fromGPS();
        /* فشل reverse-geocode (Nominatim) لا يجب أن يُسقط إحداثيات GPS الناجحة */
        let geo = {};
        try { geo = (await reverseGeocode(lat, lon)) || {}; } catch { geo = {}; }
        result = {
          lat, lon, accuracy,
          city: geo.city || '',
          country: geo.country || '',
          countryCode: geo.countryCode || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          src: 'gps',
        };
      } catch { /* يكمل على IP بالأسفل */ }
    }

    if (!result) {
      // 2. Try IP geolocation (صامت — لا يطلب أي إذن من المتصفح)
      try {
        result = await fromIP();
        /* مزوّدو الـIP يعيدون اسم المدينة بالإنجليزية («Dubai») بجوار دولة بالعربية؛
           نطلب الاسم العربي مرة واحدة (يُخزَّن مع الكاش) بمهلة قصيرة، ولا نُسقط النتيجة إن فشل الطلب.
           الخصوصية: تُرسَل الإحداثيات التقريبية (المشتقة من IP) إلى Nominatim — الخدمة نفسها المستخدمة مع GPS.
           لإيقافه: ARABIC_CITY_LOOKUP = false. */
        if (ARABIC_CITY_LOOKUP && result && !/[\u0600-\u06FF]/.test(result.city || '')) {
          try {
            const geo = await reverseGeocode(result.lat, result.lon, 2500);
            if (geo && /[\u0600-\u06FF]/.test(geo.city || '')) result.city = geo.city.slice(0, 80);
          } catch { /* نُبقي اسم المزوّد */ }
        }
      } catch {
        // 3. Absolute fallback: Mecca
        result = {
          lat: 21.3891, lon: 39.8579,
          city: 'مكة المكرمة',
          country: 'المملكة العربية السعودية',
          countryCode: 'SA',
          timezone: 'Asia/Riyadh',
          src: 'fallback',
        };
      }
    }

    setCache(result);
    return result;
  };

  const clearCache = () => { try { localStorage.removeItem(CACHE_KEY); } catch {} };

  return { detect, clearCache };
})();
