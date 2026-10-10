<div align="center">

<img src="docs/banner.jpg" alt="القرآن الكريم مباشر — إذاعة وتلاوات ومواقيت صلاة" width="100%"/>

<br/>

[![الموقع المباشر](https://img.shields.io/badge/Live-qurankareem.live-d4af37?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=1c1a13)](https://qurankareem.live)
[![PWA](https://img.shields.io/badge/PWA-Installable%20%2B%20Offline-7a5a16?style=for-the-badge&logo=pwa&logoColor=white&labelColor=1c1a13)](https://qurankareem.live)
[![Version](https://img.shields.io/badge/version-5.7.0-d4af37?style=for-the-badge&labelColor=1c1a13)](CHANGELOG.md)

![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![No framework](https://img.shields.io/badge/Framework-none-1c1a13?style=flat-square)
![RTL](https://img.shields.io/badge/Arabic-RTL-7a5a16?style=flat-square)
![Hosting](https://img.shields.io/badge/Hosting-GitHub%20Pages-181717?style=flat-square&logo=github)
![Tests](https://img.shields.io/badge/Tests-unit%20%2B%20e2e-d4af37?style=flat-square&labelColor=1c1a13)

**[🌐 الموقع المباشر](https://qurankareem.live) · [✨ المميزات](#-المميزات) · [🚀 التشغيل](#-التشغيل-محليًا) · [🧱 المعمارية](#-المعمارية) · [📨 التواصل](#-المطوّر-والتواصل)**

<sub>English version: [README.en.md](README.en.md)</sub>

</div>

---

<div dir="rtl">

## 📖 نبذة

**القرآن الكريم مباشر** تطبيق ويب تقدّمي (PWA) عربي هادئ وسريع، يجمع في مكان واحد: **بثّ إذاعات القرآن الكريم**، و**تلاوات سور كاملة** لعشرات القرّاء والروايات، و**مواقيت الصلاة**، و**اتجاه القبلة**، و**الأذكار**، و**السبحة الرقمية**.

صُمّم للهاتف أولًا (يد واحدة)، ويُثبَّت على الشاشة الرئيسية، ويعمل دون اتصال بعد أول زيارة.

> **ليس** تطبيق قراءة مصحف نصّي أو بحث في الآيات؛ هو تطبيق استماع وعبادة يومية.

## 📱 لقطات

<div align="center">

**الوضع الفاتح**

<img src="docs/screenshots/light.png" alt="لقطات التطبيق — الوضع الفاتح" width="100%"/>

**الوضع الداكن**

<img src="docs/screenshots/dark.png" alt="لقطات التطبيق — الوضع الداكن" width="100%"/>

<sub>من اليمين: الرئيسية · الإذاعات والتلاوات · مواقيت الصلاة · السبحة والأذكار</sub>

</div>

## ✨ المميزات

### 🎧 الاستماع
| الميزة | التفاصيل |
|---|---|
| **إذاعات مباشرة** | زر «استمع الآن» يشغّل **آخر إذاعة استمعتَ إليها** (أو الافتراضية). 19 بثًّا: 6 إذاعات رسمية (القرآن الكريم، الحرم المكي والمدني، الشارقة، التفسير، الرقية) و13 قارئًا. بحث وفلاتر (الكل / المفضلة / رسمية / قرّاء) |
| **تلاوات كاملة** | اختيار الرواية (حفص، ورش، قالون…) ثم القارئ ثم السورة، مع السابق/التالي واستعادة آخر حالة. البيانات من واجهة [mp3quran.net](https://mp3quran.net) |
| **حفظ للتلاوات دون اتصال** | حفظ سور محددة في ذاكرة المتصفح للاستماع بلا إنترنت |
| **مشغّل مصغّر** | يتحكم في الإذاعة أو التلاوة (المصدر النشط واضح دائمًا) مع Media Session لأزرار قفل الشاشة |
| **وضع التركيز** | شاشة مشغّل هادئة كاملة |

### 🕌 العبادة
| الميزة | التفاصيل |
|---|---|
| **مواقيت الصلاة** | بطاقة «الصلاة القادمة» بعدّاد تنازلي في أول شاشة. تُحسب محليًا بمكتبة Adhan، وتُختار طريقة الحساب حسب الدولة (أم القرى، المصرية، دبي، الكويت، قطر…) مع مذهب العصر (شافعي/حنفي)، وعدّاد للصلاة القادمة، وتنبيه صوتي اختياري |
| **القبلة** | بوصلة بحساسات الجهاز، مع الاتجاه والمسافة إلى الكعبة وحالات المحاذاة؛ تُحمَّل عند أول فتح فقط |
| **الأذكار** | أذكار الصباح والمساء بعدّادات وتقدّم يومي محفوظ |
| **السبحة الرقمية** | عدّاد بهدف قابل للتغيير ومعالم ورسالة عند بلوغ الهدف |
| **المفضلة** | حفظ الإذاعات المفضلة |

### 🎨 التجربة
- تصميم هادئ بهوية **ذهبية دافئة**، وضع **فاتح/داكن/تلقائي**
- عربي RTL أصيل، خطّا **Cairo** و**Amiri**
- أرقام **عربية هندية** (٠–٩) في كل الواجهة؛ قائمة سفلية بستة عناصر أساسية؛ حدّ أدنى 12px للنصوص وأهداف لمس 44px على اللمس؛ تخطيط مخصّص للتابلت (768–1023px: شبكات وعرض أوسع) ولسطح المكتب (شريط جانبي من 1024px) مع اختصارات لوحة المفاتيح: `Space` تشغيل/إيقاف · `M` كتم · `[` `]` السابق/التالي
- يحترم `prefers-reduced-motion`، ومؤشرات الحالة ثابتة (بلا وميض)

### 📲 PWA
- تثبيت على الشاشة الرئيسية: بانر هادئ **بحسب نيّتك** — يظهر بعد 20 ثانية من بدء الاستماع أو في الزيارة الثانية، ويحترم الإغلاق 14 يومًا، مع تعليمات يدوية حيث لا يتوفر التثبيت التلقائي
- أيقونات `any` و`maskable` منفصلة + أيقونة iOS + favicons
- **أوفلاين:** الصفحة والأصول تعمل من الكاش، وصفحة بديلة بالعربية عند عدم التوفر
- **تحديثات آمنة:** عند وجود نسخة جديدة يظهر إشعار بزر «حدّث الآن»، **دون إعادة تحميل تلقائية** حتى لا ينقطع الصوت

## 🧰 التقنيات

| الطبقة | المستخدم |
|---|---|
| اللغة | HTML + CSS + **JavaScript بدون إطار عمل** (لا React/Vue، لا مرحلة بناء) |
| البث | [hls.js](https://github.com/video-dev/hls.js) 1.5.15 (محلّي في `vendor/`، يُحمَّل عند الحاجة) |
| المواقيت | [Adhan JS](https://github.com/batoulapps/adhan-js) (محلّي) |
| التلاوات | واجهة [mp3quran.net API v3](https://mp3quran.net) |
| الموقع | كاش محلي ← مزوّدو IP (ipwho.is / ip-api / ipapi.co) ← GPS **بنقرة صريحة فقط** ← مكة كبديل؛ اسم المدينة عبر OpenStreetMap Nominatim |
| الخطوط | Cairo · Amiri (Google Fonts) |
| الاستضافة | GitHub Pages + نطاق مخصّص (`CNAME`) |

## 🧱 المعمارية

```text
.
├── index.html              page, SEO, structured data, SW registration
├── sw.js                   Service Worker (networkFirst, page/asset caches, saved recitations)
├── manifest.json           PWA identity and shortcuts
├── offline.html            offline fallback page
├── css/styles.min.css      design system (semantic tokens, light/dark)
├── js/
│   ├── app.js              orchestrator: radio, favorites, tasbih, azkar, navigation
│   ├── ui.js               prayer times UI
│   ├── prayerService.js    prayer calculation + cache
│   ├── qiblaUI.js          Qibla UI (lazy-loaded)
│   ├── qiblaService.js     Qibla math + cache
│   ├── recitationUI.js     recitations UI
│   ├── recitationService.js  mp3quran API client
│   ├── locationService.js  location detection chain
│   ├── pwa-install.js      install experience
│   └── ui-enhancements.js  small UI helpers
├── vendor/                 hls.js, adhan (local)
├── audio/takbeer.mp3       alert sound
├── tests/                  unit + e2e + run_all.sh
└── docs/                   README images
```

وصف الملفات بالإنجليزية لأن الشجرة نصّ برمجي (LTR). للتفاصيل: [`TECHNICAL_AUDIT.md`](TECHNICAL_AUDIT.md) · [`UI_UX_AUDIT.md`](UI_UX_AUDIT.md) · [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)

## 🎨 نظام الألوان

| الدور | الفاتح | الداكن |
|---|---|---|
| الأساسي (التفاعلي) | ![](https://img.shields.io/badge/-%237A5A16-7a5a16?style=flat-square) `#7A5A16` | ![](https://img.shields.io/badge/-%23D4AF37-d4af37?style=flat-square) `#D4AF37` |
| الخلفية | ![](https://img.shields.io/badge/-%23F0F1EE-f0f1ee?style=flat-square) `#F0F1EE` | ![](https://img.shields.io/badge/-%230E0D0A-0e0d0a?style=flat-square) `#0E0D0A` |
| النص | ![](https://img.shields.io/badge/-%231B1A16-1b1a16?style=flat-square) `#1B1A16` | ![](https://img.shields.io/badge/-%23F4F0E6-f4f0e6?style=flat-square) `#F4F0E6` |

لون تفاعلي واحد فقط؛ الأحمر للأخطاء حصرًا.

## 🔒 الخصوصية والأمان

- **لا حسابات، لا تتبّع، لا إعلانات، لا أدوات تحليل.** كل البيانات (المفضلة، العدّاد، الإعدادات…) تُحفظ في متصفحك فقط.
- **الموقع:** يُحدَّد تلقائيًا تقريبيًا عبر IP؛ **GPS لا يُطلب إلا بنقرتك**. ولعرض اسم المدينة بالعربية تُرسَل الإحداثيات التقريبية (المشتقة من IP) إلى OpenStreetMap Nominatim مرة واحدة ويُخزَّن الناتج. ويمكنك مسح كل شيء من «الإعدادات ← إعادة تعيين البيانات».
- الاتصالات الخارجية: بثّ الإذاعات، mp3quran.net، مزوّدو تحديد الموقع، Nominatim، Google Fonts.
- بيانات التخزين المحلي تُتحقَّق قبل الاستخدام (أنواع/نطاقات)، ونصوص الـ API تُهرَّب قبل العرض؛ لا `eval` ولا `document.write`.
- لا يوجد تشفير في التطبيق (ولا حاجة له؛ لا أسرار ولا حسابات).

## ♿ إمكانية الوصول

HTML دلالي، `lang="ar" dir="rtl"`، رابط تخطٍّ، بطاقات الإذاعات/القرّاء/السور أزرار حقيقية، حوارات بإدارة تركيز كاملة (دخول/حصر/إعادة)، مناطق `aria-live` لحالة التشغيل، حلقات تركيز ظاهرة لكل عناصر لوحة المفاتيح، تباين مفحوص (WCAG AA) في الوضعين.

## 🚀 التشغيل محليًا

لا يوجد بناء. أي خادم ثابت يكفي (الـ Service Worker يحتاج `localhost` أو HTTPS):

```bash
git clone https://github.com/k5alooood/Quran.git
cd Quran
python3 -m http.server 8000      # أو: npx serve .
# افتح http://localhost:8000
```

## 🧪 الاختبارات

```bash
pip install playwright pillow && playwright install chromium
bash tests/run_all.sh            # صياغة + وحدة + e2e + فحص وصول
SLOW=1 bash tests/run_all.sh     # + اختبار بانر التثبيت (~40 ث)
```

| النوع | المحتوى |
|---|---|
| وحدة (Node) | حسابات القبلة (25) · التحقق من الكاش (20، بمحاكاة) · عدّاد الصلاة (5) · اسم المدينة بالعربية (6) |
| e2e (Chromium) | انحدار شامل (55) · تغييرات 5.4.0: حوارات/بطاقات/أرقام/تابلت (67) · تخزين تالف/مسموم (17) · تحديث SW (7) · بانر التثبيت (5) · فحص وصول وتباين |

النتائج الكاملة وما **لم** يُختبر بعد (صوت حقيقي، أجهزة Android/iOS، Lighthouse، Firefox/Safari): [`QA_FINAL_REPORT.md`](QA_FINAL_REPORT.md).

## 🌍 النشر

الموقع منشور على **GitHub Pages** من الفرع `main`، والنطاق عبر ملف `CNAME` (يجب أن يبقى `qurankareem.live` فقط). عند تغيير أي CSS/JS/HTML:

1. ارفع رقم الكاش في `sw.js` (`CACHE_S` و`CACHE_P`) حتى تصل التحديثات للمستخدمين.
2. حدّث `VERSION` والتذييل في `index.html` و`CHANGELOG.md`.
3. شغّل `bash tests/run_all.sh` قبل الدفع.

## ⚠️ ملاحظات

- مواقيت الصلاة محسوبة آليًا؛ يُرجى مطابقتها مع الجهة الرسمية في بلدك عند الحاجة.
- المحتوى الصوتي (البثّ والتلاوات) يعود لأصحابه ومصادره المذكورة، والتطبيق مشغّل فقط.
- لم يُختبر بعد على أجهزة حقيقية: التثبيت، الصوت في الخلفية وقفل الشاشة، البوصلة بالحساس، وسفاري iOS.

## 🙏 شكر وتقدير

[mp3quran.net](https://mp3quran.net) · [Adhan JS](https://github.com/batoulapps/adhan-js) · [hls.js](https://github.com/video-dev/hls.js) · [OpenStreetMap Nominatim](https://nominatim.org) · [Google Fonts](https://fonts.google.com) · وكل الجهات والمذيعين الذين يتيحون هذا البثّ.

## 📨 المطوّر والتواصل

<div align="center">

**خالد سامح** — مطوّر ومصمّم **القرآن الكريم مباشر**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-k5aloood-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/k5aloood)
[![الموقع](https://img.shields.io/badge/Website-qurankareem.live-d4af37?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=1c1a13)](https://qurankareem.live)
[![GitHub](https://img.shields.io/badge/GitHub-k5alooood-181717?style=for-the-badge&logo=github)](https://github.com/k5alooood)

لاقتراح ميزة أو الإبلاغ عن مشكلة: [افتح Issue](https://github.com/k5alooood/Quran/issues) أو راسلني على لينكدإن.

<sub>صُنع بـ ❤️ لخدمة كتاب الله — اللهم تقبّل.</sub>

</div>

</div>
