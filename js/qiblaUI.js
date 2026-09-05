'use strict';

/**
 * QiblaUI — شاشة بوصلة اتجاه القبلة
 * ────────────────────────────────────────────────────────────────────────
 * المعمارية: الموقع (مُعاد استخدامه من LocationService الموجود) → حساب اتجاه
 * القبلة محليًا عبر QiblaService (بدون أي API خارجي) → اتجاه الجهاز عبر
 * مستشعرات المتصفح (DeviceOrientationEvent) → تنعيم دائري → مؤشر بصري سلس.
 *
 * نظام الإحداثيات المستخدَم (موثَّق صراحة لتفادي أخطاء تحويل الإحداثيات الشائعة):
 *   - heading: 0..360، بالساعة، 0=شمال حقيقي/مغناطيسي (حسب ما يوفره المتصفح)
 *   - alpha الخام من الحدث يزيد عكس عقارب الساعة من نقطة بداية عشوائية،
 *     لذلك التحويل المعتمد هو: heading = normalize(360 - alpha + زاوية دوران الشاشة)
 *   - على iOS/Safari: event.webkitCompassHeading يُستخدَم مباشرة كما هو
 *     (بالفعل بالساعة ومصحَّح بالنسبة لدوران الشاشة من طرف النظام).
 *   - لا يُطبَّق أي تصحيح انحراف مغناطيسي إضافي — القراءة تُستخدم كما توفرها
 *     المنصة لتفادي التصحيح المزدوج.
 */
const QiblaUI = (() => {

  const $ = id => document.getElementById(id);

  /* ── عناصر DOM ── */
  let screenEl, bodyEl, closeBtn;

  /* ── الحالة العامة ── */
  let state = 'idle'; // idle | locating | need-permission | error-permission | error-location | error-sensor | ready
  let coords = null;
  let qiblaBearing = null;
  let distanceKm = null;

  /* ── حالة الاتجاه/المستشعر ── */
  let rawHeading = null;
  let smoothedHeading = 0;
  let continuousRotation = 0;
  let hasFirstReading = false;
  let orientationHandler = null;
  let rafId = null;
  let sensorTimeoutId = null;
  let lastFrameHeading = null;
  let jumpCount = 0;
  let calibrationHintShown = false;
  let lastAlignState = null; // null = لم تُحسب أي حالة محاذاة بعد، يضمن ظهور أول تحديث فعلي دائمًا

  const SMOOTH_ALPHA = 0.18;
  const JUMP_THRESHOLD_DEG = 25;
  const JUMP_TRIGGER_COUNT = 6;

  /* ── مراجع لعناصر داخل شاشة "جاهز" (تُملأ عند كل renderReady) ── */
  let ringEl = null, arrowEl = null, statusTextEl = null, statusBoxEl = null,
      bearingValEl = null, headingValEl = null, distValEl = null, accValEl = null,
      calibBoxEl = null;

  /* ══════════════════════════════════════════════════
     أدوات مساعدة
  ══════════════════════════════════════════════════ */
  const needsIOSPermission = () =>
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';

  const requestPermission = async () => {
    if (!needsIOSPermission()) return 'granted';
    try { return await DeviceOrientationEvent.requestPermission(); }
    catch { return 'denied'; }
  };

  const classifyAccuracy = loc => {
    if (!loc) return 'poor';
    if (loc.src === 'fallback') return 'poor';
    if (loc.src === 'gps') {
      if (typeof loc.accuracy === 'number') {
        if (loc.accuracy <= 50) return 'good';
        if (loc.accuracy <= 500) return 'fair';
        return 'poor';
      }
      return 'good';
    }
    return 'fair'; // تقدير عبر IP — مستوى مدينة تقريبًا
  };

  const ACCURACY_LABEL = { good: '📍 دقيق', fair: '〰️ تقريبي', poor: '⚠️ منخفض' };

  const fmtDeg = n => Math.round(QiblaService.normalizeAngle(n)) + '°';
  const fmtDist = km => km == null ? '—' : (km < 10 ? km.toFixed(1) : Math.round(km)).toString() + ' كم';

  /* ══════════════════════════════════════════════════
     قوالب العرض (تُستبدل بالكامل عند تغيّر الحالة فقط —
     أما التحديث اللحظي للبوصلة فيتم عبر DOM مباشرة بدون إعادة رسم)
  ══════════════════════════════════════════════════ */
  const renderLocating = () => {
    bodyEl.innerHTML = `
      <div class="qibla-center-msg">
        <div class="qibla-spinner" aria-hidden="true"></div>
        <p>جارٍ تحديد موقعك…</p>
      </div>`;
  };

  const renderNeedPermission = () => {
    bodyEl.innerHTML = `
      <div class="qibla-center-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="46" height="46" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/>
        </svg>
        <p>لحساب اتجاه القبلة بدقة، يحتاج التطبيق إذنك لاستخدام حساس اتجاه الجهاز (البوصلة).</p>
        <button class="qibla-primary-btn" id="qiblaEnableSensorBtn" type="button">تفعيل البوصلة</button>
      </div>`;
    $('qiblaEnableSensorBtn')?.addEventListener('click', onPermissionButtonClick);
  };

  const renderErrorPermission = () => {
    bodyEl.innerHTML = `
      <div class="qibla-center-msg qibla-center-msg--warn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="46" height="46" aria-hidden="true">
          <path d="M12 9v4"/><path d="M12 17h.01"/>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        </svg>
        <p>تم رفض إذن حساس الاتجاه، فلا يمكن عرض بوصلة حيّة. يمكنك تفعيله من إعدادات المتصفح ثم إعادة المحاولة.</p>
        <button class="qibla-primary-btn" id="qiblaRetryPermBtn" type="button">إعادة المحاولة</button>
      </div>`;
    $('qiblaRetryPermBtn')?.addEventListener('click', () => beginSensors());
  };

  const renderErrorLocation = () => {
    bodyEl.innerHTML = `
      <div class="qibla-center-msg qibla-center-msg--warn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="46" height="46" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <p>تعذّر تحديد موقعك، وهو ضروري لحساب اتجاه القبلة. تأكد من إذن الموقع ثم أعد المحاولة.</p>
        <button class="qibla-primary-btn" id="qiblaRetryLocBtn" type="button">إعادة المحاولة</button>
      </div>`;
    $('qiblaRetryLocBtn')?.addEventListener('click', () => open());
  };

  /* حالة عدم توفر مستشعر اتجاه على الإطلاق — نعرض المعلومات الثابتة بدل بوصلة حيّة (لا بوصلة وهمية) */
  const renderErrorSensor = () => {
    const dirAr = qiblaBearing != null ? QiblaService.getCompassDirectionAr(qiblaBearing) : '—';
    bodyEl.innerHTML = `
      <div class="qibla-center-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="46" height="46" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M16 3v18"/>
        </svg>
        <p>جهازك لا يوفّر حساس اتجاه (بوصلة) يدعم العرض الحي. إليك اتجاه القبلة المحسوب من موقعك:</p>
      </div>
      <div class="qibla-static-result">
        <span class="qibla-static-deg">${qiblaBearing != null ? fmtDeg(qiblaBearing) : '—'}</span>
        <span class="qibla-static-dir">${dirAr} من الشمال</span>
        ${distanceKm != null ? `<span class="qibla-static-dist">${fmtDist(distanceKm)} إلى الكعبة المشرّفة</span>` : ''}
      </div>`;
  };

  const buildTicks = () => {
    let s = '';
    for (let i = 0; i < 24; i++) {
      const angle = i * 15;
      const long = angle % 90 === 0;
      const len = long ? 16 : 8;
      s += `<line class="qd-tick${long ? ' qd-tick--major' : ''}" x1="150" y1="${14}" x2="150" y2="${14 + len}" transform="rotate(${angle} 150 150)"/>`;
    }
    return s;
  };

  const renderReady = () => {
    bodyEl.innerHTML = `
      <div class="qibla-compass-wrap">
        <div class="qibla-top-readout">
          <span class="qtr-label">اتجاه القبلة</span>
          <span class="qtr-val" id="qiblaBearingVal">${qiblaBearing != null ? fmtDeg(qiblaBearing) : '--°'}</span>
        </div>

        <div class="qibla-dial-housing">
          <div class="qibla-pointer-fixed" aria-hidden="true"></div>
          <svg class="qibla-dial" viewBox="0 0 300 300" role="img" aria-label="بوصلة اتجاه القبلة">
            <circle class="qd-bezel" cx="150" cy="150" r="140"/>
            <g id="qiblaRing">
              ${buildTicks()}
              <text class="qd-cardinal" x="150" y="42" text-anchor="middle">ش</text>
              <text class="qd-cardinal" x="258" y="156" text-anchor="middle">ق</text>
              <text class="qd-cardinal" x="150" y="270" text-anchor="middle">ج</text>
              <text class="qd-cardinal" x="42" y="156" text-anchor="middle">غ</text>
              <g id="qiblaArrow" class="qd-qibla-arrow">
                <path class="qd-arrow-shape" d="M150 24 L164 62 L150 52 L136 62 Z"/>
                <circle class="qd-kaaba-dot" cx="150" cy="18" r="6.5"/>
              </g>
            </g>
            <circle class="qd-hub" cx="150" cy="150" r="5.5"/>
          </svg>
        </div>

        <div class="qibla-status" id="qiblaStatusBox" role="status" aria-live="polite">
          <span id="qiblaStatusText">ابحث عن اتجاه القبلة بتحريك جهازك ببطء</span>
        </div>

        <div class="qibla-calib-hint hidden" id="qiblaCalibHint">
          حرّك جهازك على شكل رقم 8 ببطء لمعايرة البوصلة. قد يتأثر الحساس بمعادن أو مكبرات صوت قريبة.
        </div>

        <div class="qibla-meta-row">
          <div class="qibla-meta-item"><span class="qm-label">اتجاهك</span><span class="qm-val" id="qiblaHeadingVal">--°</span></div>
          <div class="qibla-meta-item"><span class="qm-label">المسافة</span><span class="qm-val">${fmtDist(distanceKm)}</span></div>
          <div class="qibla-meta-item"><span class="qm-label">دقة الموقع</span><span class="qm-val">${ACCURACY_LABEL[classifyAccuracy(coords)]}</span></div>
        </div>

        ${coords && coords.src === 'fallback' ? `<div class="qibla-fallback-note">تعذّر تحديد موقعك الفعلي — الاتجاه المعروض محسوب من موقع مكة المكرمة الافتراضي وليس موقعك.</div>` : ''}

        <p class="qibla-disclaimer">أفضل اتجاه متاح اعتمادًا على مستشعرات جهازك — قد يتأثر بدقة الموقع أو تداخل مغناطيسي قريب، وليس اتجاهًا مضمون الدقة الكاملة.</p>
      </div>`;

    ringEl        = $('qiblaRing');
    arrowEl       = $('qiblaArrow');
    statusTextEl  = $('qiblaStatusText');
    statusBoxEl   = $('qiblaStatusBox');
    bearingValEl  = $('qiblaBearingVal');
    headingValEl  = $('qiblaHeadingVal');
    calibBoxEl    = $('qiblaCalibHint');

    if (arrowEl && qiblaBearing != null) {
      arrowEl.setAttribute('transform', `rotate(${qiblaBearing} 150 150)`);
    }
  };

  const setState = s => {
    state = s;
    if (s === 'locating') renderLocating();
    else if (s === 'need-permission') renderNeedPermission();
    else if (s === 'error-permission') renderErrorPermission();
    else if (s === 'error-location') renderErrorLocation();
    else if (s === 'error-sensor') renderErrorSensor();
    else if (s === 'ready') renderReady();
  };

  /* ══════════════════════════════════════════════════
     المعايرة / كشف التشويش المغناطيسي
  ══════════════════════════════════════════════════ */
  const showCalibrationHint = () => {
    calibrationHintShown = true;
    if (calibBoxEl) calibBoxEl.classList.remove('hidden');
    setTimeout(() => { calibrationHintShown = false; if (calibBoxEl) calibBoxEl.classList.add('hidden'); }, 8000);
  };

  /* ══════════════════════════════════════════════════
     الاهتزاز اللمسي — مرة واحدة فقط عند الدخول لحالة المحاذاة
  ══════════════════════════════════════════════════ */
  const triggerHapticOnce = () => {
    try { if (navigator.vibrate) navigator.vibrate(55); } catch {}
  };

  const ALIGN_MESSAGES = {
    perfect: () => '🎯 أنت متجه للقبلة تمامًا',
    aligned: () => '✅ أنت متجه للقبلة',
    close:   rel => rel > 0 ? '↪ اقترب — عدّل يمينًا قليلاً' : '↩ اقترب — عدّل يسارًا قليلاً',
    off:     rel => rel > 0 ? '↻ استدر يمينًا' : '↺ استدر يسارًا',
  };

  const updateAlignmentUI = (alignState, relative) => {
    if (statusTextEl) statusTextEl.textContent = ALIGN_MESSAGES[alignState](relative);
    if (statusBoxEl) statusBoxEl.className = 'qibla-status qibla-status--' + alignState;
    if (arrowEl) arrowEl.classList.toggle('qd-qibla-arrow--aligned', alignState === 'perfect' || alignState === 'aligned');
  };

  const updateReadout = () => {
    if (headingValEl) headingValEl.textContent = fmtDeg(smoothedHeading);
    if (qiblaBearing == null) return;

    const relative = QiblaService.getShortestAngularDifference(smoothedHeading, qiblaBearing);
    const absDiff = Math.abs(relative);
    const alignState = QiblaService.getAlignmentState(absDiff);

    if (alignState !== lastAlignState) {
      updateAlignmentUI(alignState, relative);
      const enteringGood = (alignState === 'perfect' || alignState === 'aligned');
      const wasGood = (lastAlignState === 'perfect' || lastAlignState === 'aligned');
      if (enteringGood && !wasGood) triggerHapticOnce();
      lastAlignState = alignState;
    }
  };

  /* ══════════════════════════════════════════════════
     حلقة الرسم (rAF) — منفصلة عن معدل أحداث المستشعر لتفادي إعادة رسم React-style مفرطة
  ══════════════════════════════════════════════════ */
  const startRenderLoop = () => {
    const step = () => {
      if (hasFirstReading && rawHeading !== null && ringEl) {
        const delta = QiblaService.getShortestAngularDifference(smoothedHeading, rawHeading);
        smoothedHeading = QiblaService.normalizeAngle(smoothedHeading + delta * SMOOTH_ALPHA);

        const target = -smoothedHeading;
        const rotDelta = QiblaService.getShortestAngularDifference(continuousRotation % 360, target);
        continuousRotation += rotDelta;

        ringEl.setAttribute('transform', `rotate(${continuousRotation} 150 150)`);
        updateReadout();
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
  };

  const stopRenderLoop = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };

  /* ══════════════════════════════════════════════════
     أحداث المستشعر
  ══════════════════════════════════════════════════ */
  const onHeading = heading => {
    rawHeading = heading;
    if (!hasFirstReading) {
      hasFirstReading = true;
      smoothedHeading = heading;
      continuousRotation = -heading;
      lastFrameHeading = heading;
      if (sensorTimeoutId) { clearTimeout(sensorTimeoutId); sensorTimeoutId = null; }
    }
    if (lastFrameHeading !== null) {
      const jump = Math.abs(QiblaService.getShortestAngularDifference(lastFrameHeading, heading));
      if (jump > JUMP_THRESHOLD_DEG) {
        jumpCount++;
        if (jumpCount >= JUMP_TRIGGER_COUNT && !calibrationHintShown) { showCalibrationHint(); jumpCount = 0; }
      } else if (jump < 5) {
        jumpCount = Math.max(0, jumpCount - 1);
      }
    }
    lastFrameHeading = heading;
  };

  const handleOrientationEvent = event => {
    let heading = null;
    if (typeof event.webkitCompassHeading === 'number' && !isNaN(event.webkitCompassHeading)) {
      heading = QiblaService.normalizeAngle(event.webkitCompassHeading);
    } else if (event.alpha !== null && event.alpha !== undefined) {
      const screenAngle = (screen.orientation && typeof screen.orientation.angle === 'number')
        ? screen.orientation.angle
        : (typeof window.orientation === 'number' ? window.orientation : 0);
      heading = QiblaService.normalizeAngle(360 - event.alpha + screenAngle);
    }
    if (heading === null) return;
    onHeading(heading);
  };

  const startSensors = () => {
    stopSensors();
    hasFirstReading = false;
    jumpCount = 0;
    lastFrameHeading = null;
    lastAlignState = null;

    orientationHandler = handleOrientationEvent;

    /* نُفضّل حدث "الاتجاه المطلق" المرتبط فعليًا بالشمال المغناطيسي عندما يكون مدعومًا (أغلب Android/Chrome) */
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', orientationHandler, true);
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', orientationHandler, true);
    } else {
      setState('error-sensor');
      return;
    }

    /* إن لم تصل أي قراءة خلال مهلة معقولة، الجهاز غالبًا لا يوفّر بوصلة فعلية قابلة للاستخدام */
    sensorTimeoutId = setTimeout(() => { if (!hasFirstReading) setState('error-sensor'); }, 3000);

    startRenderLoop();
  };

  const stopSensors = () => {
    if (orientationHandler) {
      window.removeEventListener('deviceorientationabsolute', orientationHandler, true);
      window.removeEventListener('deviceorientation', orientationHandler, true);
      orientationHandler = null;
    }
    if (sensorTimeoutId) { clearTimeout(sensorTimeoutId); sensorTimeoutId = null; }
    stopRenderLoop();
  };

  /* ══════════════════════════════════════════════════
     الموقع
  ══════════════════════════════════════════════════ */
  const ensureLocation = async () => {
    setState('locating');
    try {
      let loc = QiblaService.getCache();
      if (!loc || typeof loc.lat !== 'number') {
        loc = await LocationService.detect(false);
      }
      coords = loc;
      qiblaBearing = QiblaService.calculateQiblaBearing(loc.lat, loc.lon);
      distanceKm = QiblaService.distanceToKaaba(loc.lat, loc.lon);
      QiblaService.setCache({ lat: loc.lat, lon: loc.lon, accuracy: loc.accuracy, src: loc.src });
      return true;
    } catch {
      setState('error-location');
      return false;
    }
  };

  /* ══════════════════════════════════════════════════
     دورة حياة الشاشة
  ══════════════════════════════════════════════════ */
  const beginSensors = async () => {
    if (typeof DeviceOrientationEvent === 'undefined' && !('ondeviceorientationabsolute' in window)) {
      setState('error-sensor');
      return;
    }
    if (needsIOSPermission()) { setState('need-permission'); return; }
    setState('ready');
    startSensors();
  };

  const onPermissionButtonClick = async () => {
    const result = await requestPermission();
    if (result === 'granted') { setState('ready'); startSensors(); }
    else setState('error-permission');
  };

  const open = async () => {
    if (!screenEl) return;
    screenEl.classList.remove('hidden');
    screenEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const ok = await ensureLocation();
    if (!ok) return;
    await beginSensors();
  };

  const close = () => {
    stopSensors();
    if (screenEl) { screenEl.classList.add('hidden'); screenEl.setAttribute('aria-hidden', 'true'); }
    document.body.style.overflow = '';
  };

  const isOpen = () => screenEl && !screenEl.classList.contains('hidden');

  /* إيقاف المستشعرات عند إخفاء التبويب/التطبيق، وإعادة تشغيلها عند العودة إن كانت الشاشة مفتوحة */
  const onVisibilityChange = () => {
    if (!isOpen()) return;
    if (document.hidden) stopSensors();
    else if (state === 'ready') startSensors();
  };

  /* ══════════════════════════════════════════════════
     التهيئة
  ══════════════════════════════════════════════════ */
  const init = () => {
    screenEl = $('qiblaScreen');
    bodyEl = $('qiblaBody');
    closeBtn = $('qiblaClose');
    if (!screenEl || !bodyEl) return;

    closeBtn?.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) close(); });
    document.addEventListener('visibilitychange', onVisibilityChange);

    /* تفويض الحدث (event delegation) لأن بطاقة الصلاة تُعاد رسمها ديناميكيًا
       (تحديث/إعادة محاولة) فيُستبدل الزر بعنصر DOM جديد — ربط مباشر لمرة واحدة
       كان سيفقد أثره بعد أول إعادة رسم */
    document.addEventListener('click', e => {
      if (e.target.closest('[data-qibla-open]')) open();
    });
  };

  return { init, open, close };
})();
