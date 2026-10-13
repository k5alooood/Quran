'use strict';
/* اختبار انحدار: رقم طريقة Aladhan الاحتياطي يُشتق من الدولة (كان method=3 ثابتًا لكل الدول).
   المصدر مُحمَّل داخل vm مع fetch مُحاكًى — اختبار وحدة بمحاكاة وليس اختبار متصفح.
   تشغيل:  node tests/unit/apiMethod.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const ok = (cond, label) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label); cond ? pass++ : fail++; };

function load(fetchImpl) {
  const store = {};
  const ctx = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    fetch: fetchImpl || (() => Promise.reject(new Error('offline'))),
    AbortController, setTimeout, clearTimeout, Intl, Date, Math, JSON, Number, Array, Object, String, Promise, console, navigator: {},
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'prayerService.js'), 'utf8') + '\n;this.__m = PrayerService;', ctx);
  return ctx.__m;
}

const PS = load();
const M = PS.API_METHOD_MAP;

/* الأرقام الرسمية من توثيق Aladhan: 1 كراتشي، 2 ISNA، 3 MWL، 4 أم القرى، 5 المصرية، 7 طهران، 9 الكويت، 10 قطر،
   11 سنغافورة، 13 ديانت، 15 لجنة رؤية الهلال، 16 دبي */
const expected = {
  SA: '4', AE: '16', KW: '9', QA: '10', BH: '4', OM: '4', YE: '4', IQ: '4',
  EG: '5', SD: '5', LY: '5', MA: '5', DZ: '5', TN: '5', SY: '5', JO: '5', PS: '5', LB: '5',
  IR: '7', TR: '13', AZ: '13', PK: '1', AF: '1', IN: '1', BD: '1',
  GB: '3', IE: '3', DE: '3', NL: '3', SE: '3', NO: '3',
  US: '2', CA: '2', MX: '2', MY: '11', SG: '11', ID: '11',
  FR: '15', BE: '15', /* مطابقة للمسار الأساسي (لجنة رؤية الهلال) وليست UOIF=12 */
};
Object.keys(expected).forEach(cc => ok(M[cc] === expected[cc], 'API_METHOD_MAP[' + cc + '] = ' + expected[cc] + ' (got ' + M[cc] + ')'));
ok(Object.keys(M).length === Object.keys(expected).length, 'لا دول إضافية غير موثّقة في الجدول (' + Object.keys(M).length + ')');
ok(PS.apiMethodFor('ZZ') === '3' && PS.apiMethodFor(undefined) === '3' && PS.apiMethodFor('') === '3', 'دولة غير معروفة أو فارغة → MWL (3) كالسلوك القديم');
ok(Object.values(M).every(v => /^\d+$/.test(v) && [1, 2, 3, 4, 5, 7, 9, 10, 11, 13, 15, 16].includes(+v)), 'كل القيم أرقام Aladhan رسمية معروفة');

/* المسار الاحتياطي يمرّر الرقم فعليًا في الطلب (adhan غير معرَّفة في vm فيُستخدم الـAPI) */
(async () => {
  const seen = [];
  const mkFetch = () => (url) => {
    seen.push(String(url));
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { timings: { Fajr: '05:00', Sunrise: '06:15', Dhuhr: '12:20', Asr: '15:45', Maghrib: '18:20', Isha: '19:40' } } }) });
  };
  for (const [cc, tz, want] of [['AE', 'Asia/Dubai', '16'], ['EG', 'Africa/Cairo', '5'], ['US', 'America/New_York', '2'], ['ZZ', 'UTC', '3']]) {
    seen.length = 0;
    const svc = load(mkFetch());
    const res = await svc.getPrayers(25.2, 55.3, cc, tz, 'shafi');
    ok(Array.isArray(res) && res.length === 6, 'getPrayers(' + cc + ') يرجع ٦ مواقيت عبر المسار الاحتياطي');
    ok(seen.length === 1 && seen[0].indexOf('method=' + want + '&') !== -1, 'طلب Aladhan لدولة ' + cc + ' يحمل method=' + want + ' (' + (seen[0] || '').replace(/^.*\?/, '') + ')');
  }
  console.log('TOTAL: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
