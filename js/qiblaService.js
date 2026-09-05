'use strict';

/**
 * QiblaService — حسابات اتجاه القبلة (رياضيات خالصة، بدون أي اعتماد على DOM أو المستشعرات)
 * ────────────────────────────────────────────────────────────────────────
 * كل الحسابات هنا محلية بالكامل، لا تحتاج إنترنت ولا أي API خارجي.
 * إحداثيات الكعبة المشرّفة مصدرها منظمة المساحة السعودية (مصدر مرجعي دقيق شائع الاستخدام).
 */
const QiblaService = (() => {

  /* مصدر واحد للحقيقة لإحداثيات الكعبة — لا تُكرَّر في أي ملف آخر */
  const KAABA_LATITUDE  = 21.422487;
  const KAABA_LONGITUDE = 39.826206;

  /* عتبات محاذاة القبلة (بالدرجات) — قابلة للتعديل من مكان واحد */
  const QIBLA_PERFECT_THRESHOLD   = 3;   // محاذاة مثالية
  const QIBLA_ALIGNMENT_THRESHOLD = 5;   // محاذاة جيدة
  const QIBLA_CLOSE_THRESHOLD     = 10;  // قريب من الاتجاه

  const CACHE_KEY = 'qr_qibla_cache_v1';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // يوم واحد — نفس إحداثيات الموقع غالبًا صالحة لهذه المدة

  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;

  /**
   * تطبيع أي زاوية إلى المدى [0, 360)
   */
  const normalizeAngle = angle => {
    let a = angle % 360;
    if (a < 0) a += 360;
    return a;
  };

  /**
   * حساب اتجاه البداية (initial great-circle bearing) من نقطة المستخدم إلى الكعبة.
   * المعادلة الكروية القياسية — نفس المعادلة المستخدمة في الملاحة الجوية والبحرية.
   * @returns {number} زاوية 0..360 (0=شمال، 90=شرق، 180=جنوب، 270=غرب)
   */
  const calculateQiblaBearing = (latitude, longitude) => {
    const phi1 = toRad(latitude);
    const phi2 = toRad(KAABA_LATITUDE);
    const deltaLambda = toRad(KAABA_LONGITUDE - longitude);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) -
              Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const theta = Math.atan2(y, x);
    return normalizeAngle(toDeg(theta));
  };

  /**
   * المسافة الدائرية الكبرى بين نقطتين (هافرسين) بالكيلومتر — لعرض "المسافة إلى الكعبة" فقط.
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dPhi = toRad(lat2 - lat1);
    const dLambda = toRad(lon2 - lon1);
    const a = Math.sin(dPhi / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const distanceToKaaba = (lat, lon) => calculateDistance(lat, lon, KAABA_LATITUDE, KAABA_LONGITUDE);

  /**
   * أقصر فرق زاوي بين اتجاه الجهاز الحالي واتجاه القبلة.
   * يُرجع زاوية موقّعة في المدى [-180, +180]:
   *   موجب  → القبلة على يمين اتجاه الجهاز (يجب الدوران يمينًا)
   *   سالب  → القبلة على يسار اتجاه الجهاز (يجب الدوران يسارًا)
   */
  const getShortestAngularDifference = (heading, qiblaBearing) => {
    let diff = (qiblaBearing - heading + 540) % 360 - 180;
    /* حماية من سلبي الصفر (-0) الناتج عن عمليات % مع بعض المدخلات — يُطبَّع لصفر موجب نظيف */
    if (diff === 0) diff = 0;
    return diff;
  };

  /**
   * تحويل الزاوية المطلقة (0-360) إلى نقطة بوصلة عربية مختصرة (شمال/شمال شرقي/...)
   */
  const COMPASS_POINTS_AR = ['شمال','شمال شرقي','شرق','جنوب شرقي','جنوب','جنوب غربي','غرب','شمال غربي'];
  const getCompassDirectionAr = angle => {
    const idx = Math.round(normalizeAngle(angle) / 45) % 8;
    return COMPASS_POINTS_AR[idx];
  };

  /**
   * تصنيف حالة المحاذاة بناءً على الفرق الزاوي المطلق.
   * @returns {'perfect'|'aligned'|'close'|'off'}
   */
  const getAlignmentState = absDiff => {
    if (absDiff <= QIBLA_PERFECT_THRESHOLD) return 'perfect';
    if (absDiff <= QIBLA_ALIGNMENT_THRESHOLD) return 'aligned';
    if (absDiff <= QIBLA_CLOSE_THRESHOLD) return 'close';
    return 'off';
  };

  /* ══════════════════════════════════════════════════
     تخزين مؤقت محلي لآخر موقع/اتجاه قبلة محسوب — للعمل بدون إنترنت
  ══════════════════════════════════════════════════ */
  const getCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch { return null; }
  };

  const setCache = data => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
  };

  const clearCache = () => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  };

  return {
    KAABA_LATITUDE, KAABA_LONGITUDE,
    QIBLA_PERFECT_THRESHOLD, QIBLA_ALIGNMENT_THRESHOLD, QIBLA_CLOSE_THRESHOLD,
    normalizeAngle,
    calculateQiblaBearing,
    calculateDistance,
    distanceToKaaba,
    getShortestAngularDifference,
    getCompassDirectionAr,
    getAlignmentState,
    getCache, setCache, clearCache,
  };
})();

/* تصدير لبيئة Node لأغراض الاختبار الآلي فقط — لا يؤثر على بيئة المتصفح */
if (typeof module !== 'undefined' && module.exports) module.exports = QiblaService;
