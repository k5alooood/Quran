# TECHNICAL_AUDIT — Quran Kareem v5.3.8

> نطاق وصدق: المراجعة على الكود الفعلي (11 ملف JS + sw.js + index.html + CSS 93KB) في بيئة sandbox بلا إنترنت وبلا Git وبمتصفح Chromium فقط. لا Lighthouse ولا Firefox/WebKit ولا أجهزة حقيقية — كل ما لم يُختبر موسوم NOT VERIFIED. لا توجد درجة جودة إجمالية.

## 1) خط الأساس (قبل أي تعديل في هذه الجولة)
| البند | الحالة |
|---|---|
| بنية المشروع | HTML واحد + 9 وحدات JS (`app.js` 54KB منسّق مركزي) + `sw.js` + `vendor/` (hls.min.js, adhan.umd.min.js) + `audio/takbeer.mp3` |
| Git | غير متاح (لا `.git`) — لا diff/commit |
| صياغة JS / JSON | `node --check` نظيف؛ `manifest.json` صالح |
| اختبارات موجودة | 25/25 للقبلة (`js/__tests__`) فقط |
| تشفير | **لا يُستخدم تشفير**: بحث عن `crypto.`/`btoa(`/`atob(`/`Math.random` في كل JS وHTML وSW = 0 نتيجة. لا مفاتيح ولا أسرار في المستودع. لا خلط بين ترميز/تشفير |
| أنماط خطرة | `eval`/`new Function`/`document.write`/`outerHTML`/`insertAdjacentHTML` = 0. `innerHTML`: 28 موضعًا (app 5، qiblaUI 6، recitationUI 13، ui 3، prayerService 1) |
| تبعيات خارجية | Google Fonts (CSS)، mp3quran.net (API)، ipwho.is / ip-api.com / ipapi.co (موقع IP)، nominatim (عكسي)، مكتبتان محلّيتان في `vendor/` |

## 2) سجل المشاكل الموحّد
الشدّة: Critical/High/Medium/Low/Info. «Verified» = أُعيد إنتاجها بتنفيذ فعلي؛ «Inspection» = من قراءة الكود فقط.

| ID | الشدّة | الحالة | المشكلة | السبب الجذري | الإصلاح (ملف:سطر) |
|---|---|---|---|---|---|
| SEC-01 | Medium | Verified ✔ مُصلحة | XSS مخزَّن: حقول `nameAr`/`icon`/`timeStr` المخزَّنة في `qr_prayers_v3` تُحقن في `innerHTML` (أُعيد إنتاجها: `window.__xss=1` في 3 من 3 حالات) | الكاش يُعاد كما هو دون تحقق (`return obj.prayers`) | `js/prayerService.js:80-112` يقبل شكلًا صارمًا ويعيد بناء الاسم/الأيقونة من جداول ثابتة |
| REL-01 | Medium | Verified ✔ | كاش موقع تالف (`lat:"abc"` أو `data:7`) ← شاشة «تعذّر تحديد الموقع» **ولا تُشفى بإعادة التحميل** | `getCache()` يعيد البيانات بلا تحقق | `js/locationService.js:8-32` (`sanitizeLocation`) |
| REL-02 | Medium | Verified ✔ | `qr_azprog` = `null`/`5`/`"x"` ← TypeError غير ملتقط عند التشغيل | `azProg.morning` على قيمة غير كائن | `js/app.js:216-218` |
| REL-03 | Low | Verified ✔ | عدّاد السبحة سالب يظهر «-٣»؛ هدف سالب/ضخم يُقبل | لا تحقق نطاق | `js/app.js:213-214` |
| REL-04 | Low | Verified ✔ (اختبار طفرة) | موقع IP بإحداثيات 0 يُرفض كقيمة falsy | `!m.lat \|\| !m.lon` | `js/locationService.js` (`Number.isFinite`) |
| REL-05 | Low | Inspection | `qr_favs` غير مصفوفة يُنتج Set من أحرف | `new Set(JSON.parse(...))` | `js/app.js:215` |
| A11Y-01 | Medium | Verified ✔ | قائمة الرأس المغلقة تُستقبل بالتبويب (5 محطات تركيز داخلها) وهي `aria-hidden` | إخفاء بـ`opacity` فقط | `css/styles.min.css` `.app-menu{visibility:hidden}` ← 0 محطة |
| A11Y-02 | Medium | Verified ✔ | تباين الفاتح: نص حبر داكن على ذهبي بني (≈3:1) في زر التثبيت/زر التسبيح/الوضع النشط، وبادجات ذهبية على ذهبي فاتح | ألوان ثابتة | انظر UI_UX_AUDIT.md |
| A11Y-03 | Low | Verified ✔ | نصوص أصغر من 11px (9–10.5px) | `.56–.65rem` | رفعها إلى `.72rem` (باستثناء تسميات القائمة السفلية) |
| A11Y-04 | Low | Inspection ✔ | زر تحديث الموقع اسمه من `title` فقط | — | `js/ui.js` `aria-label` |
| SEC-03 | Low | Partially mitigated | لا CSP ولا Referrer-Policy | GitHub Pages لا يسمح بترويسات | `index.html:7-8`: `referrer` + CSP جزئية (`object-src 'none'; base-uri 'self'; form-action 'none'`) — بلا انتهاكات في الاختبار |
| SEC-04 | Info | Not verified | `ip-api.com` المجاني قد لا يدعم HTTPS (حسب توثيق المزوّد؛ لم يُختبر هنا) — قد يفشل دائمًا ثم يُنتقل للتالي | — | لا تغيير؛ يُراجع يدويًا |
| SEC-05 | Info | Known | خطوط Google بلا SRI (غير ممكن لـCSS ديناميكي) | — | — |

**الحصيلة:** 9 مشاكل مؤكَّدة (Verified) اكتُشفت في هذه الجولة وأُصلحت كلها؛ 1 تحصين من الفحص؛ 1 تخفيف جزئي؛ 2 معلوماتية. المتبقي: Critical 0 · High 0 · Medium 0 · Low 3 (تسميات القائمة السفلية 9.6px، غياب `frame-ancestors`، دالتا تهريب HTML متكررتان).

## 3) مراجعة أمنية
- **innerHTML (28):** المصادر: بيانات ثابتة (محطات/أذكار/أيقونات)، أرقام مُنسَّقة، أو نصوص مُهرَّبة (`escapeHTML` في ui.js لـcity/country، و`esc` في recitationUI لأسماء القرّاء من mp3quran.net). بعد SEC-01 لا يصل نص غير موثوق من التخزين إلى innerHTML.
- **التخزين المحلي:** كل قراءة ضمن `try/catch`؛ أضيف تحقق أنواع/نطاقات للمواقع والمواقيت والقبلة والتقدّم.
- **Service Worker:** لا يُخزّن استجابات غير `ok`، ولا `opaque` (`sw.js:186`)؛ يتجاوز البث وواجهات API (`BYPASS`)؛ رسالة `SKIP_WAITING` فقط عبر زر المستخدم.
- **الأذونات:** GPS لا يُطلب إلا بنقر صريح؛ حساسات الاتجاه عند فتح البوصلة.
- **روابط خارجية:** `target="_blank"` مع `rel="noopener"` (مفحوصة).
- **أخطاء للمستخدم:** رسائل عربية عامة؛ `console.warn` موضعان فقط (ui.js).
- **الاعتماد على الدفاع من جانب العميل:** لا أسرار؛ لا شيء يستحق التشفير.

## 4) PWA وأوفلاين
manifest صالح، 6 أيقونات + 3 shortcuts تُحمَّل، أيقونات maskable منفصلة، precache 27 ملفًا موجودة. تدفق التحديث **مُختبر**: نسخة جديدة ← toast ← بلا إعادة تحميل تلقائية ← بعد الموافقة تُفعَّل ويُنظَّف القديم (`tests/e2e/sw_update.py`). الأوفلاين مُختبر بإيقاف الخادم فعليًا. NOT VERIFIED: الصوت الأوفلاين الحقيقي، الخلفية/قفل الشاشة، التثبيت على جهاز.

## 5) الأداء
CSS 100KB → 92.8KB (إزالة ميت). لا قياس Lighthouse (BLOCKED) فلا ادّعاء بتحسّن أداء. قيود: GitHub Pages بلا Cache-Control مخصّص.

## 6) الدين التقني المتبقي
`js/app.js` (54KB) كائن إله؛ `esc` (recitationUI) و`escapeHTML` (ui.js) متكرّران؛ ~300 `!important` في CSS ناتجة عن طبقات هوية متعاقبة؛ التحقق من الكاش مكرَّر بين ثلاث وحدات (يمكن توحيده في وحدة مشتركة).

## 7) مخاطر متبقية
iOS/Android الحقيقيان؛ شبكة بطيئة؛ سلوك مزوّدي IP الفعلي؛ Firefox/Safari.
