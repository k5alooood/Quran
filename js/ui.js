'use strict';

/**
 * PrayerUI — وحدة واجهة مواقيت الصلاة
 * ─────────────────────────────────────
 * ✓ عرض المواقيت + العداد التنازلي
 * ✓ زر الجرس: تنبيه صوتي عند دخول وقت الصلاة
 * ✓ رسالة Flash عند دخول وقت الصلاة
 * ✗ بدون أي كود بوصلة قبلة (محذوف كاملاً)
 */
const PrayerUI = (() => {

  /* ══════════════════════════════════════════════════
     الحالة الداخلية
  ══════════════════════════════════════════════════ */
  let countdownInterval = null;
  let locationData      = null;
  let audioUnlocked     = false;

  /* ── إصلاح: تحميل حالة الجرس من localStorage عند التهيئة ── */
  let notifyEnabled = (() => {
    try { return localStorage.getItem('qr_bell') === '1'; } catch(e) { return false; }
  })();

  /* v5: المذهب الفقهي لحساب وقت العصر — شافعي افتراضيًا، مع إمكانية التبديل للحنفي وحفظه */
  const getMadhab = () => {
    try { return localStorage.getItem('qr_madhab') === 'hanafi' ? 'hanafi' : 'shafi'; } catch(e) { return 'shafi'; }
  };
  const setMadhab = m => {
    try { localStorage.setItem('qr_madhab', m); } catch(e) {}
  };

  /* ── كائن الصوت — يُحمَّل فقط عند الطلب ── */
  const adhanAudio = new Audio('./audio/takbeer.mp3');
  adhanAudio.preload = 'none';
  adhanAudio.addEventListener('error', () => {
    console.warn('[PrayerUI] تعذّر تحميل ملف الصوت:', adhanAudio.src);
  });

  /* ══════════════════════════════════════════════════
     أعلام الدول — معادلة Regional Indicator الصحيحة
  ══════════════════════════════════════════════════ */
  const getFlagEmoji = code => {
    if (!code || code.length !== 2) return '🌍';
    const BASE = 0x1F1E6;
    const c = code.toUpperCase();
    return String.fromCodePoint(BASE + c.charCodeAt(0) - 65) +
           String.fromCodePoint(BASE + c.charCodeAt(1) - 65);
  };

  /* ══════════════════════════════════════════════════
     أسماء الدول بالعربية
  ══════════════════════════════════════════════════ */
  const COUNTRY_AR = {
    SA:'المملكة العربية السعودية', AE:'الإمارات العربية المتحدة',
    EG:'جمهورية مصر العربية',     KW:'الكويت',    QA:'قطر',
    BH:'البحرين',  OM:'سلطنة عُمان', YE:'اليمن',   IQ:'العراق',
    JO:'الأردن',   SY:'سوريا',        LB:'لبنان',   PS:'فلسطين',
    MA:'المملكة المغربية', TN:'تونس', DZ:'الجزائر', LY:'ليبيا',
    SD:'السودان',  SO:'الصومال',      MR:'موريتانيا',
    TR:'تركيا',    IR:'إيران',         PK:'باكستان', IN:'الهند',
    ID:'إندونيسيا',MY:'ماليزيا',      SG:'سنغافورة',BD:'بنغلاديش',
    AF:'أفغانستان',GB:'المملكة المتحدة',FR:'فرنسا',   DE:'ألمانيا',
    US:'الولايات المتحدة',CA:'كندا',   AU:'أستراليا', NL:'هولندا',
    BE:'بلجيكا',  SE:'السويد',        NO:'النرويج',  DK:'الدنمارك',
    IT:'إيطاليا', ES:'إسبانيا',       RU:'روسيا',    CN:'الصين',
    JP:'اليابان', KR:'كوريا الجنوبية',AZ:'أذربيجان', IE:'أيرلندا',
  };

  const getCountryAr = cc => COUNTRY_AR[cc] || locationData?.country || cc || '';

  /* ══════════════════════════════════════════════════
     قائمة المدن (للاختيار اليدوي)
  ══════════════════════════════════════════════════ */
  const CITIES = [
    {city:'مكة المكرمة',   country:'SA',lat:21.3891, lon:39.8579, tz:'Asia/Riyadh'},
    {city:'المدينة المنورة',country:'SA',lat:24.5247, lon:39.5692, tz:'Asia/Riyadh'},
    {city:'الرياض',         country:'SA',lat:24.7136, lon:46.6753, tz:'Asia/Riyadh'},
    {city:'جدة',            country:'SA',lat:21.4858, lon:39.1925, tz:'Asia/Riyadh'},
    {city:'دبي',            country:'AE',lat:25.2048, lon:55.2708, tz:'Asia/Dubai'},
    {city:'أبوظبي',         country:'AE',lat:24.4539, lon:54.3773, tz:'Asia/Dubai'},
    {city:'القاهرة',        country:'EG',lat:30.0444, lon:31.2357, tz:'Africa/Cairo'},
    {city:'الإسكندرية',     country:'EG',lat:31.2001, lon:29.9187, tz:'Africa/Cairo'},
    {city:'الكويت',         country:'KW',lat:29.3759, lon:47.9774, tz:'Asia/Kuwait'},
    {city:'الدوحة',         country:'QA',lat:25.2854, lon:51.5310, tz:'Asia/Qatar'},
    {city:'المنامة',        country:'BH',lat:26.2285, lon:50.5860, tz:'Asia/Bahrain'},
    {city:'مسقط',           country:'OM',lat:23.5880, lon:58.3829, tz:'Asia/Muscat'},
    {city:'بغداد',          country:'IQ',lat:33.3152, lon:44.3661, tz:'Asia/Baghdad'},
    {city:'عمّان',           country:'JO',lat:31.9454, lon:35.9284, tz:'Asia/Amman'},
    {city:'بيروت',          country:'LB',lat:33.8938, lon:35.5018, tz:'Asia/Beirut'},
    {city:'دمشق',           country:'SY',lat:33.5138, lon:36.2765, tz:'Asia/Damascus'},
    {city:'القدس',          country:'PS',lat:31.7683, lon:35.2137, tz:'Asia/Hebron'},
    {city:'تونس',           country:'TN',lat:36.8189, lon:10.1658, tz:'Africa/Tunis'},
    {city:'الرباط',         country:'MA',lat:34.0209, lon:-6.8416, tz:'Africa/Casablanca'},
    {city:'الجزائر',        country:'DZ',lat:36.7372, lon:3.0865,  tz:'Africa/Algiers'},
    {city:'طرابلس',         country:'LY',lat:32.9024, lon:13.1803, tz:'Africa/Tripoli'},
    {city:'الخرطوم',        country:'SD',lat:15.5007, lon:32.5599, tz:'Africa/Khartoum'},
    {city:'أنقرة',          country:'TR',lat:39.9334, lon:32.8597, tz:'Europe/Istanbul'},
    {city:'إسطنبول',        country:'TR',lat:41.0082, lon:28.9784, tz:'Europe/Istanbul'},
    {city:'طهران',          country:'IR',lat:35.6892, lon:51.3890, tz:'Asia/Tehran'},
    {city:'كراتشي',         country:'PK',lat:24.8607, lon:67.0011, tz:'Asia/Karachi'},
    {city:'إسلام آباد',     country:'PK',lat:33.6007, lon:73.0679, tz:'Asia/Karachi'},
    {city:'نيودلهي',        country:'IN',lat:28.6139, lon:77.2090, tz:'Asia/Kolkata'},
    {city:'ڈاكا',           country:'BD',lat:23.8103, lon:90.4125, tz:'Asia/Dhaka'},
    {city:'جاكرتا',         country:'ID',lat:-6.2088, lon:106.8456,tz:'Asia/Jakarta'},
    {city:'كوالالمبور',     country:'MY',lat:3.1390,  lon:101.6869,tz:'Asia/Kuala_Lumpur'},
    {city:'لندن',           country:'GB',lat:51.5074, lon:-0.1278, tz:'Europe/London'},
    {city:'باريس',          country:'FR',lat:48.8566, lon:2.3522,  tz:'Europe/Paris'},
    {city:'برلين',          country:'DE',lat:52.5200, lon:13.4050, tz:'Europe/Berlin'},
    {city:'نيويورك',        country:'US',lat:40.7128, lon:-74.0060,tz:'America/New_York'},
    {city:'لوس أنجلوس',     country:'US',lat:34.0522, lon:-118.2437,tz:'America/Los_Angeles'},
    {city:'تورنتو',         country:'CA',lat:43.6532, lon:-79.3832,tz:'America/Toronto'},
    {city:'سيدني',          country:'AU',lat:-33.8688,lon:151.2093,tz:'Australia/Sydney'},
  ];

  /* ══════════════════════════════════════════════════
     HTML Templates
  ══════════════════════════════════════════════════ */

  /* زر الجرس */
  const makeBellBtnHTML = () => `
    <button class="pt-bell-btn" id="ptBellBtn" type="button"
            title="تفعيل تنبيه الصلاة"
            aria-label="تفعيل تنبيه الصلاة"
            aria-pressed="false">
      <svg class="bell-icon bell-icon--on" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        <circle class="bell-dot" cx="18" cy="8" r="3" stroke="none"/>
      </svg>
      <svg class="bell-icon bell-icon--off" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </button>`;

  /* Skeleton */
  const skeletonHTML = () => `
    <div class="pt-section-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>مواقيت الصلاة
    </div>
    <div class="pt-skeleton">
      <div class="pt-sk-header">
        <div class="pt-sk-bar w60 pulse"></div>
        <div class="pt-sk-bar w30 pulse"></div>
      </div>
      <div class="pt-sk-next pulse"></div>
      <div class="pt-sk-grid">
        ${Array(6).fill('<div class="pt-sk-cell pulse"></div>').join('')}
      </div>
    </div>`;

  /* Error */
  const makeErrorHTML = (msg, retryId) => `
    <div class="pt-section-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>مواقيت الصلاة
    </div>
    <div class="pt-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="30" height="30">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <circle cx="12" cy="16" r=".6" fill="currentColor"/>
      </svg>
      <p>${msg}</p>
      <button class="pt-retry-btn" id="${retryId}">إعادة المحاولة</button>
    </div>`;

  /* Manual city select */
  const makeManualHTML = selId => `
    <div class="pt-section-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>مواقيت الصلاة
    </div>
    <div class="pt-manual">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="24" height="24" stroke-linecap="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      <p>اسمح بالوصول إلى موقعك أو اختر مدينتك</p>
      <select class="pt-city-sel" id="${selId}">
        <option value="-1">— اختر المدينة —</option>
        ${CITIES.map((c,i) => `<option value="${i}">${getFlagEmoji(c.country)} ${c.city}</option>`).join('')}
      </select>
    </div>`;

  /* v5: تنبيه صريح عند استخدام موقع احتياطي (مكة) بدل الموقع الفعلي — بدل الرجوع الصامت السابق */
  const makeFallbackNoticeHTML = manualBtnId => `
    <div class="pt-fallback-notice" role="status">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18" aria-hidden="true">
        <path d="M12 9v4"/><path d="M12 17h.01"/>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      </svg>
      <span>تعذّر تحديد موقعك — المواقيت المعروضة الآن لمكة المكرمة كموقع افتراضي مؤقت وليست موقعك الفعلي.</span>
      <button class="pt-fallback-btn" id="${manualBtnId}" type="button">اختر مدينتك</button>
    </div>`;

  /* Prayer card (main) */
  const makePrayerCardHTML = (prayers, next, loc, isFallback, manualBtnId) => {
    const flag        = getFlagEmoji(loc?.countryCode || '');
    const countryAr   = getCountryAr(loc?.countryCode || '');
    const city        = loc?.city || '';
    const methodLabel = prayers[0]?.method || 'مواقيت الصلاة';

    return `
      <div class="pt-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        مواقيت الصلاة
        ${makeBellBtnHTML()}
        <button class="pt-refresh-btn" id="ptRefreshBtn" title="تحديث الموقع">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
      ${isFallback ? makeFallbackNoticeHTML(manualBtnId) : ''}
      <div class="pt-header">
        <div class="pt-location">
          <span class="pt-flag" role="img" aria-label="${countryAr}">${flag}</span>
          <div class="pt-loc-text">
            <span class="pt-city">${city}</span>
            <span class="pt-country">${countryAr}</span>
          </div>
        </div>
        <span class="pt-method-badge">${methodLabel}</span>
        <button class="pt-madhab-btn" id="ptMadhabBtn" type="button" title="تبديل المذهب الفقهي لحساب وقت العصر">
          ${getMadhab() === 'hanafi' ? 'حنفي' : 'شافعي'}
        </button>
      </div>
      ${next ? `
      <div class="pt-next-wrap">
        <div class="pt-next-label"><span class="pt-next-dot"></span>الصلاة القادمة</div>
        <div class="pt-next-name">${next.nameAr}</div>
        <div class="pt-countdown" id="ptCountdown">${PrayerService.formatCountdown(next.ts - Date.now())}</div>
        <div class="pt-next-time">${next.timeStr}</div>
      </div>` : ''}
      <div class="pt-grid">
        ${prayers.map(p => `
          <div class="pt-prayer-item${next && p.key===next.key?' pt-next-active':''}${p.key==='sunrise'?' pt-sunrise':''}">
            <div class="pt-p-icon">${p.icon}</div>
            <div class="pt-p-name">${p.nameAr}</div>
            <div class="pt-p-time">${p.timeStr}</div>
          </div>`).join('')}
      </div>`;
  };

  /* ══════════════════════════════════════════════════
     التنبيه الصوتي
  ══════════════════════════════════════════════════ */

  /** يُشغّل الصوت ويعرض Flash عند دخول وقت الصلاة */
  const playAdhanNotification = prayerName => {
    if (!notifyEnabled) return;

    /* رسالة Flash أولاً (لا تعتمد على الصوت) */
    showPrayerFlash(prayerName);

    /* تشغيل الصوت مع معالجة رفض autoplay */
    adhanAudio.currentTime = 0;
    const p = adhanAudio.play();
    if (p instanceof Promise) {
      p.catch(err => {
        console.warn('[PrayerUI] رُفض تشغيل الصوت:', err.name);
      });
    }
  };

  /** رسالة Flash جميلة تختفي بعد 5 ثوانٍ */
  const showPrayerFlash = prayerName => {
    const old = document.getElementById('prayerFlash');
    if (old) old.remove();

    const flash = document.createElement('div');
    flash.id = 'prayerFlash';
    flash.className = 'prayer-flash';
    flash.setAttribute('role', 'alert');
    flash.setAttribute('aria-live', 'assertive');
    flash.innerHTML = `
      <div class="prayer-flash__inner">
        <div class="pf-icon" aria-hidden="true">🕌</div>
        <div class="pf-text">
          <strong>حان وقت صلاة ${prayerName}</strong>
          <span>اللهم بلّغنا صلاة ${prayerName}</span>
        </div>
      </div>`;
    document.body.appendChild(flash);

    requestAnimationFrame(() => requestAnimationFrame(() => flash.classList.add('pf-show')));

    setTimeout(() => {
      flash.classList.remove('pf-show');
      setTimeout(() => flash.remove(), 480);
    }, 5000);
  };

  /** Toast مؤقت للتأكيد */
  const showTempToast = msg => {
    const old = document.getElementById('ptTempToast');
    if (old) old.remove();

    const t = document.createElement('div');
    t.id = 'ptTempToast';
    t.className = 'pt-temp-toast';
    t.textContent = msg;
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);

    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('pt-toast-show')));

    setTimeout(() => {
      t.classList.remove('pt-toast-show');
      setTimeout(() => t.remove(), 400);
    }, 2500);
  };

  /* ══════════════════════════════════════════════════
     منطق زر الجرس
  ══════════════════════════════════════════════════ */

  /** يُحدّث مظهر الجرس */
  const updateBellUI = btn => {
    if (!btn) return;
    btn.classList.toggle('bell-active', notifyEnabled);
    btn.setAttribute('aria-pressed', String(notifyEnabled));
    /* v5: توضيح صريح أن التنبيه صوتي داخل الصفحة فقط، وليس إشعار خلفية حقيقيًا —
       التطبيق لا يستخدم Web Push/Notification API، فالتنبيه يعمل فقط أثناء فتح
       الصفحة فعليًا (تبويب مفتوح وليس في الخلفية العميقة أو مغلقًا). */
    btn.title = notifyEnabled
      ? 'إيقاف تنبيه الصلاة (يعمل فقط أثناء فتح التطبيق)'
      : 'تفعيل تنبيه الصلاة (يعمل فقط أثناء فتح التطبيق)';
    btn.setAttribute('aria-label', btn.title);
  };

  /* ══════════════════════════════════════════════════
     startCountdown — العداد التنازلي مع التنبيه
  ══════════════════════════════════════════════════ */
  const startCountdown = next => {
    clearInterval(countdownInterval);
    if (!next) return;

    let notificationFired = false;

    countdownInterval = setInterval(() => {
      const el = document.getElementById('ptCountdown');
      if (!el || !el.isConnected) { clearInterval(countdownInterval); return; }

      const msLeft = next.ts - Date.now();
      el.textContent = PrayerService.formatCountdown(msLeft);

      if (msLeft <= 0) {
        clearInterval(countdownInterval);

        /* إطلاق التنبيه مرة واحدة فقط */
        if (!notificationFired) {
          notificationFired = true;
          playAdhanNotification(next.nameAr);
        }

        /* إعادة حساب المواقيت للصلاة التالية */
        setTimeout(() => init(true), 1500);
      }
    }, 1000);
  };

  /* ══════════════════════════════════════════════════
     ربط المعالجات بعد الرندر
  ══════════════════════════════════════════════════ */
  const bindHandlers = ({ onRetry, onCitySelect, onRefresh, onManual, manualBtnId } = {}) => {
    setTimeout(() => {

      if (onRetry) {
        document.querySelectorAll('.pt-retry-btn').forEach(b => b.addEventListener('click', onRetry));
      }

      const selEl = document.querySelector('.pt-city-sel');
      if (selEl && onCitySelect) {
        selEl.addEventListener('change', e => {
          const idx = parseInt(e.target.value, 10);
          if (!isNaN(idx) && idx >= 0 && CITIES[idx]) onCitySelect(CITIES[idx]);
        });
      }

      const refBtn = document.getElementById('ptRefreshBtn');
      if (refBtn && onRefresh) refBtn.addEventListener('click', onRefresh);

      const madhabBtn = document.getElementById('ptMadhabBtn');
      if (madhabBtn) {
        madhabBtn.addEventListener('click', () => {
          const next = getMadhab() === 'hanafi' ? 'shafi' : 'hanafi';
          setMadhab(next);
          showTempToast(next === 'hanafi' ? '↻ التحويل إلى المذهب الحنفي' : '↻ التحويل إلى المذهب الشافعي');
          init(true);
        });
      }

      if (manualBtnId && onManual) {
        const manBtn = document.getElementById(manualBtnId);
        if (manBtn) manBtn.addEventListener('click', onManual);
      }

      /* ── زر الجرس ── */
      const bellBtn = document.getElementById('ptBellBtn');
      if (bellBtn) {
        updateBellUI(bellBtn);

        bellBtn.addEventListener('click', () => {
          notifyEnabled = !notifyEnabled;

          /* فتح قفل autoplay عند أول تفعيل (داخل حدث مستخدم) */
          if (notifyEnabled && !audioUnlocked) {
            adhanAudio.load();
            audioUnlocked = true;
          }

          updateBellUI(bellBtn);
          /* حفظ الحالة في localStorage للاستمرارية بين الجلسات */
          try { localStorage.setItem('qr_bell', notifyEnabled ? '1' : '0'); } catch(e) {}
          showTempToast(notifyEnabled ? '🔔 تم تفعيل تنبيه الصلاة (يعمل أثناء فتح التطبيق فقط)' : '🔕 تم إيقاف تنبيه الصلاة');
        });
      }
    }, 80);
  };

  /* ══════════════════════════════════════════════════
     إدارة حاوية القسم
  ══════════════════════════════════════════════════ */
  const getSection = () => {
    let sec = document.getElementById('prayerSection');
    if (!sec) {
      sec = document.createElement('div');
      sec.id = 'prayerSection';
      sec.className = 'card pt-section';
      const ftr = document.querySelector('.ftr');
      ftr ? ftr.before(sec) : document.querySelector('.wrap')?.append(sec);
    }
    return sec;
  };

  const renderHTML = html => {
    const sec = getSection();
    sec.style.opacity = '0';
    sec.innerHTML = html;
    requestAnimationFrame(() => {
      sec.style.transition = 'opacity .38s ease';
      sec.style.opacity    = '1';
    });
  };

  /* ══════════════════════════════════════════════════
     initWithLocation
  ══════════════════════════════════════════════════ */
  const initWithLocation = async (loc, isFallback = false) => {
    renderHTML(skeletonHTML());
    try {
      const prayers = await PrayerService.getPrayers(
        loc.lat, loc.lon, loc.country, loc.tz || loc.timezone, getMadhab()
      );
      if (!prayers) throw new Error('no_prayers');
      const next = PrayerService.getNextPrayer(prayers);
      const manId = 'ptManual_' + Date.now();
      renderHTML(makePrayerCardHTML(prayers, next, { ...loc, countryCode: loc.country }, isFallback, manId));
      startCountdown(next);
      bindHandlers({
        onRefresh: () => init(true),
        onManual: () => {
          const selId = 'ptSel_' + Date.now();
          renderHTML(makeManualHTML(selId));
          bindHandlers({
            onCitySelect: city => {
              locationData = { ...city, countryCode: city.country, timezone: city.tz };
              initWithLocation(city, false);
            },
          });
        },
        manualBtnId: manId,
      });
    } catch {
      const eid = 'ptErr_' + Date.now();
      renderHTML(makeErrorHTML('تعذّر جلب مواقيت الصلاة', eid));
      bindHandlers({ onRetry: () => initWithLocation(loc, isFallback) });
    }
  };

  /* ══════════════════════════════════════════════════
     init — نقطة الدخول الرئيسية
  ══════════════════════════════════════════════════ */
  const init = async (forceRefresh = false) => {
    renderHTML(skeletonHTML());
    try {
      locationData = await LocationService.detect(forceRefresh);
      /* v5: LocationService.detect() لا يرفض (reject) أبدًا — فحتى عند تعذّر GPS وIP معًا
         يُرجع موقع مكة الافتراضي مع src:'fallback' بدل رمي استثناء. لذلك يجب التحقق من
         هذا العلم مباشرة هنا بدل انتظار خطأ لن يُطرح أبدًا (وهو ما كان يجعل واجهة اختيار
         المدينة يدويًا كودًا لا يمكن الوصول إليه فعليًا في أي سيناريو). */
      const isFallback = locationData?.src === 'fallback';
      const prayers = await PrayerService.getPrayers(
        locationData.lat, locationData.lon,
        locationData.countryCode, locationData.timezone, getMadhab()
      );
      if (!prayers) throw new Error('no_prayers');
      const next = PrayerService.getNextPrayer(prayers);
      const manId = 'ptManual_' + Date.now();
      renderHTML(makePrayerCardHTML(prayers, next, locationData, isFallback, manId));
      startCountdown(next);
      bindHandlers({
        onRefresh: () => init(true),
        onManual: () => {
          const selId = 'ptSel_' + Date.now();
          renderHTML(makeManualHTML(selId));
          bindHandlers({
            onCitySelect: city => {
              locationData = { ...city, countryCode: city.country, timezone: city.tz };
              initWithLocation(city, false);
            },
          });
        },
        manualBtnId: manId,
      });
    } catch (err) {
      const isPermDenied = err?.code === 1 || err?.message === 'no_geo';
      if (isPermDenied) {
        const selId = 'ptSel_' + Date.now();
        renderHTML(makeManualHTML(selId));
        bindHandlers({
          onCitySelect: city => {
            locationData = { ...city, countryCode: city.country, timezone: city.tz };
            initWithLocation(city, false);
          },
        });
      } else {
        const eid = 'ptErr_' + Date.now();
        renderHTML(makeErrorHTML('تعذّر تحديد الموقع أو جلب المواقيت', eid));
        bindHandlers({ onRetry: () => init(true) });
      }
    }
  };

  return { init };
})();
