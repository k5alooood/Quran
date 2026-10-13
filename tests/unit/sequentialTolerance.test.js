'use strict';
/* اختبار انحدار: isSequential يسمح بتسامح ±60 ثانية بين صلاتين متتاليتين (خطوط العرض العالية صيفًا) ويرفض ما عدا ذلك.
   تشغيل:  node tests/unit/sequentialTolerance.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const ok = (cond, label) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label); cond ? pass++ : fail++; };

const ctx = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, fetch: () => Promise.reject(new Error('offline')), AbortController, setTimeout, clearTimeout, Intl, Date, Math, JSON, Number, Array, Object, String, Promise, console, navigator: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'prayerService.js'), 'utf8') + '\n;this.__m = PrayerService;', ctx);
const isSeq = ctx.__m.isSequential;

const T0 = 4102444800000;
const list = (deltasMs) => deltasMs.map((d, i) => ({ key: 'k' + i, ts: T0 + d }));
const base = [0, 3600e3, 7200e3, 10800e3, 14400e3, 18000e3];
const withDelta = (idx, delta) => { const a = base.slice(); a[idx] += delta; return a; };

ok(typeof isSeq === 'function', 'isSequential مُصدَّرة للاختبار');
ok(isSeq(list(base)) === true, 'ترتيب تصاعدي عادي مقبول');
ok(isSeq(list([0, 0, 3600e3, 7200e3, 10800e3, 14400e3])) === true, 'فجر = شروق بنفس اللحظة مقبول (خطوط عرض عالية)');
ok(isSeq(list(withDelta(2, -30e3).map((v, i) => (i === 2 ? base[1] - 30e3 : v)))) === true, 'صلاة قبل سابقتها بـ٣٠ ثانية مقبولة');
ok(isSeq(list([0, 3600e3, 3600e3 - 60e3, 10800e3, 14400e3, 18000e3])) === true, 'تأخر بالضبط ٦٠ ثانية (الحدّ) مقبول');
ok(isSeq(list([0, 3600e3, 3600e3 - 60001, 10800e3, 14400e3, 18000e3])) === false, 'تأخر ٦٠٫٠٠١ ثانية مرفوض');
ok(isSeq(list([0, 3600e3, 3000e3, 10800e3, 14400e3, 18000e3])) === false, 'تقدّم صلاة بعشر دقائق مرفوض');
ok(isSeq(list(base).slice(0, 5)) === false, 'خمس صلوات فقط مرفوض');
ok(isSeq(list(base).concat([{ key: 'x', ts: T0 + 20000e3 }])) === false, 'سبع صلوات مرفوض');
ok(isSeq(null) === false && isSeq(undefined) === false && isSeq({}) === false && isSeq('x') === false, 'مدخلات غير مصفوفة مرفوضة');
console.log('TOTAL: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
