'use strict';
/* سياسة الأرقام: عدّاد الصلاة بأرقام عربية هندية. تشغيل: node tests/unit/countdown.test.js (محاكاة vm، بلا متصفح) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { localStorage: { getItem() { return null; }, setItem() {} }, Intl, Date, Math, JSON, Number, Array, Object, String, Promise, console, navigator: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'prayerService.js'), 'utf8') + '\n;this.m = PrayerService;', ctx);
let pass = 0, fail = 0;
const eq = (got, want, label) => { const ok = got === want; console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + (ok ? '' : '  got=' + got + ' want=' + want)); ok ? pass++ : fail++; };
const f = ctx.m.formatCountdown;
eq(f(3 * 3600e3 + 25 * 60e3 + 9e3), '٠٣:٢٥:٠٩', '3h25m9s in Arabic-Indic digits');
eq(f(59e3), '٠٠:٠٠:٥٩', 'under a minute');
eq(f(0), '٠٠:٠٠:٠٠', 'zero');
eq(f(-5000), '٠٠:٠٠:٠٠', 'negative clamps to zero');
eq(/[0-9]/.test(f(23 * 3600e3 + 59 * 60e3 + 59e3)), false, 'no Latin digit in a 23:59:59 countdown');

/* v5.6: الصيغة المقروءة بالوحدات (بلا أصفار بادئة) */
const w = ctx.m.formatCountdownWords;
eq(w(2 * 3600e3 + 6 * 60e3 + 11e3), '٢ س ٦ د', 'hours>0 shows hours+minutes only');
eq(w(3 * 3600e3), '٣ س', 'whole hours omit zero minutes');
eq(w(15 * 60e3 + 21e3), '١٥ د ٢١ ث', 'under an hour shows minutes+seconds');
eq(w(59e3), '٥٩ ث', 'under a minute shows seconds only');
eq(w(0), 'الآن', 'zero → now');
eq(w(-5000), 'الآن', 'negative → now');
eq(/[0-9]/.test(w(23 * 3600e3 + 59 * 60e3 + 59e3)), false, 'words format has no Latin digit');
console.log('\nTOTAL: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
