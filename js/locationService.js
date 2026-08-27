'use strict';

const LocationService = (() => {
  const CACHE_KEY = 'qr_location_v3';
  const CACHE_TTL = 6 * 60 * 60 * 1000;

  const getCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch { return null; }
  };

  const setCache = data => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
  };

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
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => reject(err),
      /* timeout رُفع إلى 10000ms — GPS الداخلي والأجهزة البطيئة تحتاج وقتاً أطول */
      { timeout: 10000, maximumAge: 300000 }
    );
  });

  const reverseGeocode = async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ar,en`;
    const r = await fetchWithTimeout(url, { headers: { 'User-Agent': 'QuranLive/3.0' } }, 6000);
    if (!r.ok) throw new Error('nominatim_fail');
    const d = await r.json();
    return {
      city: d.address?.city || d.address?.town || d.address?.village || d.address?.county || '',
      country: d.address?.country || '',
      countryCode: (d.address?.country_code || '').toUpperCase(),
    };
  };

  const fromIP = async () => {
    const endpoints = [
      { url: 'https://ipapi.co/json/', map: d => ({ lat: d.latitude, lon: d.longitude, city: d.city, country: d.country_name, cc: d.country_code, tz: d.timezone }) },
      { url: 'https://ipwho.is/',      map: d => ({ lat: d.latitude, lon: d.longitude, city: d.city, country: d.country, cc: d.country_code, tz: d.timezone }) },
      { url: 'https://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon,timezone', map: d => ({ lat: d.lat, lon: d.lon, city: d.city, country: d.country, cc: d.countryCode, tz: d.timezone }) },
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
        if (!m.lat || !m.lon || isNaN(parseFloat(m.lat))) continue;
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

  const detect = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const hit = getCache();
      if (hit) return hit;
    }

    let result;

    // 1. Try GPS + reverse geocode
    try {
      const { lat, lon } = await fromGPS();
      const geo = await reverseGeocode(lat, lon);
      result = {
        lat, lon,
        city: geo.city,
        country: geo.country,
        countryCode: geo.countryCode,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        src: 'gps',
      };
    } catch {
      // 2. Try IP geolocation
      try {
        result = await fromIP();
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
