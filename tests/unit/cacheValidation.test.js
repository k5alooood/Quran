'use strict';
/* اختبارات انحدار لقراءة الكاش من localStorage (Node بلا متصفح).
   المصدر مُحمَّل داخل vm مع localStorage/fetch مُحاكَيين — هذه اختبارات وحدة بمحاكاة (mocked) وليست اختبار متصفح.
   تشغيل:  node tests/unit/cacheValidation.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const ok = (cond, label) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label); cond ? pass++ : fail++; };

function load(file, exportName, store, extra = {}) {
  const ctx = {
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    fetch: () => Promise.reject(new Error('offline')),
    AbortController, setTimeout, clearTimeout, Intl, Date, Math, JSON, Number, Array, Object, String, Promise, console,
    navigator: {},
    ...extra,
  };
  vm.createContext(ctx);
  const src = fs.readFileSync(path.join(ROOT, 'js', file), 'utf8');
  vm.runInContext(src + '\n;this.__m = ' + exportName + ';', ctx);
  return ctx.__m;
}

const XSS = '<img src=x onerror="window.__xss=1">';
const now = () => Date.now();
const today = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const goodPrayers = () => KEYS.map((k, i) => ({ key: k, nameAr: 'x', icon: '<svg/>', timeStr: '٠٥:٠٠ ص', timeRaw: '05:00', ts: 4102444800000 + i * 3600000, methodKey: 'UmmAlQura', method: 'm' }));
const prayerCache = (mut) => { const p = goodPrayers(); if (mut) mut(p); return JSON.stringify({ date: today(), lat: 21.3891, lon: 39.8579, madhab: 'shafi', prayers: p }); };

(async () => {
  console.log('=== PrayerService cache (stored-XSS regression) ===');
  for (const field of ['nameAr', 'icon', 'timeStr', 'timeRaw']) {
    const store = { qr_prayers_v3: prayerCache(p => { p[0][field] = XSS; }) };
    const svc = load('prayerService.js', 'PrayerService', store);
    const res = await svc.getPrayers(21.3891, 39.8579, 'SA', 'Asia/Riyadh', 'shafi');
    const leaked = res && JSON.stringify(res).includes('onerror');
    ok(!leaked, 'poisoned cached "' + field + '" never reaches the UI data');
  }
  {
    const store = { qr_prayers_v3: prayerCache() };
    const svc = load('prayerService.js', 'PrayerService', store);
    const res = await svc.getPrayers(21.3891, 39.8579, 'SA', 'Asia/Riyadh', 'shafi');
    ok(res && res.length === 6 && res[0].nameAr === 'الفجر' && res[0].icon.indexOf('svg') !== -1, 'valid cache accepted; name/icon rebuilt from static tables');
    ok(res && res[0].timeStr === '٠٥:٠٠ ص', 'valid cached time string preserved');
  }
  for (const [label, prayers] of [['number', 5], ['empty array', []], ['null items', [null, 5]], ['wrong key order', goodPrayers().reverse()], ['non-finite ts', goodPrayers().map(p => Object.assign(p, { ts: 'x' }))]]) {
    const store = { qr_prayers_v3: JSON.stringify({ date: today(), lat: 21.3891, lon: 39.8579, madhab: 'shafi', prayers }) };
    const svc = load('prayerService.js', 'PrayerService', store);
    let threw = false, res;
    try { res = await svc.getPrayers(21.3891, 39.8579, 'SA', 'Asia/Riyadh', 'shafi'); } catch { threw = true; }
    ok(!threw && (res === null || !JSON.stringify(res).includes('"x"')), 'cache with ' + label + ' is rejected without throwing');
  }

  console.log('=== LocationService cache ===');
  const locOk = { lat: 25.2, lon: 55.3, city: 'Dubai', country: 'UAE', countryCode: 'ae', timezone: 'Asia/Dubai', src: 'ip' };
  {
    const store = { qr_location_v3: JSON.stringify({ ts: now(), data: locOk }) };
    const svc = load('locationService.js', 'LocationService', store);
    const r = await svc.detect(false, false);
    ok(r.lat === 25.2 && r.countryCode === 'AE' && r.city === 'Dubai', 'valid cached location accepted (country code normalised)');
  }
  for (const [label, data] of [['lat string', Object.assign({}, locOk, { lat: 'abc' })], ['data number', 7], ['lat out of range', Object.assign({}, locOk, { lat: 123 })], ['null', null]]) {
    const store = { qr_location_v3: JSON.stringify({ ts: now(), data }) };
    const svc = load('locationService.js', 'LocationService', store);
    const r = await svc.detect(false, false);
    ok(r && Number.isFinite(r.lat) && r.src === 'fallback', 'corrupt cached location (' + label + ') -> clean fallback, not the bad value');
  }
  {
    const store = { qr_location_v3: JSON.stringify({ ts: now(), data: Object.assign({}, locOk, { city: XSS.repeat(20), timezone: '<x>' }) }) };
    const svc = load('locationService.js', 'LocationService', store);
    const r = await svc.detect(false, false);
    ok(r.city.length <= 80 && r.timezone === 'UTC', 'cached city is length-capped and timezone is whitelisted');
  }
  {
    const store = {};
    const svc = load('locationService.js', 'LocationService', store, {
      fetch: () => Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ latitude: 0, longitude: 0, city: 'Null Island', country: 'X', country_code: 'GH', timezone: 'Africa/Accra', success: true }) }),
    });
    const r = await svc.detect(true, false);
    ok(r.src === 'ip' && r.lat === 0 && r.lon === 0, 'IP location with lat/lon exactly 0 is accepted (was rejected as falsy)');
  }

  console.log('=== QiblaService cache ===');
  {
    const store = { qr_qibla_cache_v1: JSON.stringify({ ts: now(), data: { lat: 'x', lon: null } }) };
    const q = load('qiblaService.js', 'QiblaService', store);
    ok(q.getCache() === null, 'garbage qibla cache rejected');
    store.qr_qibla_cache_v1 = JSON.stringify({ ts: now(), data: { lat: 10, lon: 20, accuracy: 30, src: 'gps' } });
    const c = q.getCache();
    ok(c && c.lat === 10 && c.src === 'gps', 'valid qibla cache accepted');
  }

  console.log('\nTOTAL: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
