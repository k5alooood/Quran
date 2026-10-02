# QA_FINAL_REPORT — Quran Kareem v5.3.8

## بيئة الاختبار
Linux sandbox، Chromium 141 (Playwright)، Node، **بلا إنترنت** (واجهات mp3quran.net مُحاكاة في الاختبارات)، بلا Git، بلا Lighthouse، بلا Firefox/WebKit، بلا أجهزة. أنواع الاختبار: **آلي بمتصفح** (e2e)، **آلي بمحاكاة** (وحدة بـvm)، **فحص ثابت**، **محاكاة بصرية بلقطات**. لا اختبار يدوي على جهاز حقيقي.

## الاستراتيجية
لكل خلل مؤكَّد: إعادة إنتاج قبل الإصلاح ← إصلاح ← اختبار انحدار ← إعادة تشغيل الحزمة. لم يُعدَّ أي اختبار ناجحًا إن كان محاكًى دون ذكر ذلك.

## مصفوفة الاختبار

| Test ID | Area | Test Case | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|---|
| UT-01 | Qibla | حساب الاتجاه/المسافة/الحالة (25 حالة) | كلها صحيحة | 25/25 | PASS | node js/__tests__/qiblaService.test.js |
| UT-02 | Cache | كاش مواقيت مسموم (4 حقول) لا يصل للواجهة | لا `onerror` في البيانات | 4/4 (محاكاة vm) | PASS | tests/unit/cacheValidation.test.js — محاكاة localStorage/fetch |
| UT-03 | Cache | كاش مواقيت: صالح يُقبل؛ رقم/فارغ/null/ترتيب خاطئ/ts غير رقمي يُرفض بلا استثناء | قبول/رفض صحيح | 8/8 | PASS | نفس الملف |
| UT-04 | Location | كاش موقع تالف (4 أشكال) ← fallback نظيف؛ city≤80؛ timezone مُرشَّح | fallback | 5/5 | PASS | نفس الملف |
| UT-05 | Location | IP بإحداثيات 0 يُقبل (REL-04) | مقبول | مقبول؛ يفشل على الكود القديم | PASS | اختبار طفرة (استُبدل الشرط القديم ← FAIL ثم أُعيد) |
| UT-06 | Qibla | كاش قبلة تالف مرفوض/صالح مقبول | — | 2/2 | PASS | نفس الملف |
| E2E-01 | Init | تحميل بلا أخطاء JS (فاتح/داكن) | 0 pageerror | 0 | PASS | regression.py |
| E2E-02 | Navigation | 6 عناصر سفلية؛ المفضلة/الإعدادات من قائمة الرأس وتُغلق | كما وُصف | صحيح | PASS | regression.py |
| E2E-03 | Radio | تبديل سريع (57 نقرة) ← ≤1 بطاقة نشطة، ≤2 audio | مستقر | مستقر | PASS | regression.py — بلا صوت حقيقي (شبكة معطّلة) |
| E2E-04 | Radio | فشل البث يعرض نص حالة | نص | نص | PASS | regression.py |
| E2E-05 | Favorites | إضافة/حذف مع التخزين | يعمل | يعمل | PASS | regression.py |
| E2E-06 | Tasbih | زيادة العدّاد | يزيد | يزيد | PASS | regression.py |
| E2E-07 | Recitation | روايات/قرّاء (API مُحاكى) وعلامة ✓ | تُعرض | تُعرض | PASS | regression.py — بيانات mp3quran مُحاكاة |
| E2E-08 | Theme | فاتح/داكن؛ لا أخضر/أزرق في الألوان المحتسبة | 0 | 0 | PASS | regression.py |
| E2E-09 | Responsive | لا تمرير أفقي عند 10 عروض | 0px | 0px | PASS | regression.py |
| E2E-10 | Storage | 17 حالة تخزين فاسد/مسموم: لا خطأ، لا XSS، لا عدّاد سالب | 0 فشل | 0 فشل (قبل الإصلاح، على نسخة 5.3.7 المسلَّمة سابقًا: 7 فشل — 3 XSS، 3 TypeError في azprog، 1 عدّاد سالب) | PASS | storage_corruption.py |
| E2E-11 | Offline | إيقاف الخادم فعليًا: 3 مسارات + صفحة بديلة | تعمل | تعمل | PASS | regression.py |
| E2E-12 | PWA | أيقونات manifest/shortcuts وprecache كلها 200؛ maskable منفصلة | نعم | نعم | PASS | regression.py |
| E2E-13 | SW update | toast ← بلا إعادة تحميل ← موافقة ← تفعيل وتنظيف | كما وُصف | 7/7 | PASS | sw_update.py (نسخة مؤقتة) |
| E2E-14 | Install | لا بانر قبل 15ث؛ يظهر بعدها؛ الإغلاق يُحفظ ويبقى بعد إعادة التحميل | كما وُصف | 5/5 | PASS | install_banner.py — مع عنصر تحكّم إيجابي |
| A11Y-T1 | Keyboard | محطات تركيز داخل القائمة المغلقة | 0 | قبل 5 ← بعد 0 | PASS | قياس قبل/بعد (Tab×14) |
| A11Y-T2 | Keyboard | كل محطة تبويب (45) بحلقة تركيز | كلها | 45/45 | PASS | a11y_scan.py |
| A11Y-T3 | Contrast | 10 محدِّدات × فاتح/داكن (بكسلي) | ≥AA | 0 مخالفة | PASS | pixel_contrast.py |
| A11Y-T4 | Contrast | ماسح الألوان التقريبي (فاتح) | 0 | 7 تعليمات تقريبية (بادج 4.23، رابط التذييل، إلخ) مخالفها بكسليًا ≥AA | PARTIALLY VERIFIED | a11y_scan.py — تقدير متحفّظ على خلفيات متدرّجة |
| A11Y-T5 | Semantics | H1 واحد، landmarks، lang/dir، aria-live، لا أزرار بلا اسم | سليم | سليم | PASS | a11y_scan.py |
| A11Y-T6 | Screen reader | TalkBack/VoiceOver/NVDA | — | لم يُجرَ | NOT VERIFIED | لا أداة/جهاز |
| VIS-01 | Visual | انحدار بصري بعد تنظيف CSS (42 لقطة) | لا تغيّر | 38 متطابقة؛ 4 بصندوق 72×20 زمني | PASS | مقارنة بكسلية + تشغيلان ضوضاء |
| VIS-02 | Visual | انحدار بعد إصلاحات التباين/الخطوط | فروق مفهومة فقط | 42/42 تختلف؛ زوجان فُحصا بصريًا | PARTIALLY VERIFIED | UI_UX_AUDIT.md §6 |
| SEC-T1 | Security | eval/new Function/document.write | 0 | 0 | PASS | فحص نصي |
| SEC-T2 | Security | انتهاكات CSP الجزئية عند التحميل والتفاعل | 0 | 0 | PASS | securitypolicyviolation |
| SEC-T3 | Security | SAST/dependency scan | — | لم يُجرَ | NOT VERIFIED | لا أداة |
| PERF-01 | Performance | Lighthouse / Core Web Vitals | — | لم يُقَس | BLOCKED | لا Lighthouse ولا إنترنت |
| BRW-01 | Browsers | Firefox / WebKit | — | غير متاح | BLOCKED | Chromium فقط مثبّت |
| DEV-01 | Devices | Android / iOS حقيقيان (تثبيت، صوت، خلفية، قفل شاشة، بوصلة، إذن موقع) | — | لم يُجرَ | NOT VERIFIED | BLOCKED بالبيئة |
| AUD-01 | Audio | تشغيل صوت راديو/تلاوة فعلي وتبديل بينهما | — | لم يُجرَ | NOT VERIFIED | لا شبكة |
| AUD-02 | Time | حدّ DST في `parseHHMM` | — | لم يُختبر | NOT VERIFIED | كود مُعدَّل في 5.3.4 |
| NET-01 | Network | 2G/3G/مهلات/API 429 | — | لم يُجرَ | NOT VERIFIED | لا شبكة |

## الإجماليات حسب الحالة

BLOCKED: 2 · NOT VERIFIED: 6 · PARTIALLY VERIFIED: 2 · PASS: 27

عدد التشغيلات الآلية الفعلية: وحدة 45 (25 قبلة + 20 كاش)، e2e: 55 + 17 حالة تخزين + 7 تحديث SW + 5 بانر = 84.

## تعليمات التشغيل المحلي
```
pip install playwright pillow && playwright install chromium
bash tests/run_all.sh            # كل شيء ما عدا اختبار البانر البطيء
SLOW=1 bash tests/run_all.sh     # + install_banner.py (~40 ثانية)
node tests/unit/cacheValidation.test.js
python3 tests/e2e/sw_update.py
```

## مشاكل معروفة وخطوات إعادة الإنتاج
1. تسميات القائمة السفلية 9.6px — افتح التطبيق على 320px.
2. لا `frame-ancestors` — غير ممكن على GitHub Pages (يتطلب ترويسة).
3. البانر يغطي المشغّل لحظة ظهوره — انتظر 15ث على أي صفحة.
4. `ip-api.com` المجاني قد لا يخدم HTTPS (غير مؤكَّد).

## ملاحظات صدق
- في هذه الجولة أخطأتُ في سكربتين من سكربتات الاختبار نفسها (محاكاة بلا `headers`، وقياس بكسلي لزر دائري يشمل خلفية البطاقة) وصحّحتهما قبل تسجيل أي نتيجة؛ وقياس بانر التثبيت البكسلي فشل فاعتمدتُ الحساب من الألوان المحسوبة وذكرتُ ذلك.
- فحص «البانر المرفوض» القديم في regression.py كان ضعيفًا (قد ينجح دون إثبات) فحُذف واستُبدل بـinstall_banner.py مع عنصر تحكّم إيجابي.

## FINAL RELEASE STATUS
- Critical: 0 · High: 0 · Medium (مؤكَّدة): 0 مفتوحة (5 اكتُشفت وأُصلحت: SEC-01, REL-01, REL-02, A11Y-01, A11Y-02) · Low مفتوحة: 3
- مؤكَّدة اكتُشفت وأُصلحت: 9 · تحصين من الفحص: 1 · تخفيف جزئي: 1
- Tests: BLOCKED 2 / NOT VERIFIED 6 / PARTIALLY VERIFIED 2 / PASS 27

**لا يُعدّ هذا إعلانًا بالجاهزية الإنتاجية الكاملة:** الصوت الحقيقي والتثبيت والخلفية وقارئ الشاشة وLighthouse وFirefox/Safari لم تُختبر.
