'use strict';
/* اسم المدينة بالعربية عند التحديد بالـIP (v5.5.0). محاكاة vm: fetch يوجَّه حسب الرابط.
   تشغيل: node tests/unit/locationCity.test.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'locationService.js'), 'utf8');
let pass = 0, fail = 0, nominatimCalls = 0;
const ok = (c, l) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + l); c ? pass++ : fail++; };
const json = d => Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(d) });
function load(nominatim) {
  const store = {};
  const ctx = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    fetch: url => {
      if (/nominatim/.test(url)) { nominatimCalls++; return nominatim(url); }
      return json({ success: true, latitude: 25.2, longitude: 55.3, city: 'Dubai', country: 'United Arab Emirates', country_code: 'AE', timezone: { id: 'Asia/Dubai' } });
    },
    AbortController, setTimeout, clearTimeout, Intl, Date, Math, JSON, Number, Array, Object, String, Promise, console, navigator: {},
  };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\n;this.m = LocationService;', ctx);
  return ctx.m;
}
(async () => {
  let r = await load(() => json({ address: { city: 'دبي', country: 'الإمارات العربية المتحدة', country_code: 'ae' } })).detect(true, false);
  ok(r.src === 'ip' && r.city === 'دبي', 'IP result with English city is upgraded to the Arabic name from Nominatim (' + r.city + ')');
  ok(r.lat === 25.2 && r.lon === 55.3 && r.countryCode === 'AE', 'coordinates and country code are untouched by the city lookup');

  r = await load(() => Promise.reject(new Error('offline'))).detect(true, false);
  ok(r.src === 'ip' && r.city === 'Dubai', 'Nominatim failure keeps the provider name (no crash, no fallback to Makkah)');

  r = await load(() => json({ address: { city: 'Dubai' } })).detect(true, false);
  ok(r.city === 'Dubai', 'non-Arabic Nominatim answer is ignored');

  r = await load(() => json({ address: { city: '<img src=x onerror=alert(1)>'.repeat(30) + 'دبي' } })).detect(true, false);
  ok(r.city.length <= 80, 'city name from Nominatim is length-capped (80 chars)');

  const before = nominatimCalls;
  const svc = load(() => json({ address: { city: 'دبي' } }));
  await svc.detect(true, false);
  const mid = nominatimCalls;
  await svc.detect(false, false);
  ok(nominatimCalls === mid && mid > before, 'second call is served from the cache (no second Nominatim request)');

  console.log('\nTOTAL: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
