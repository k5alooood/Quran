'use strict';

const PrayerService = (() => {
  const CACHE_KEY = 'qr_prayers_v3';

  // Method names displayed in Arabic (user-facing)
  const METHOD_LABELS = {
    UmmAlQura:              'أم القرى',
    Egyptian:               'مصر والشام',
    Tehran:                 'طهران',
    Turkey:                 'تركيا',
    Karachi:                'كراتشي',
    MoonsightingCommittee:  'الهلال',
    MWL:                    'رابطة العالم الإسلامي',
    NorthAmerica:           'أمريكا الشمالية',
    Singapore:              'سنغافورة',
    Dubai:                  'الإمارات',
    Kuwait:                 'الكويت',
    Qatar:                  'قطر',
  };

  /* v5.1 — إصلاح جذري لخطأ حساب مواقيت الصلاة في الخليج:
     كانت كل دول الخليج (بما فيها الإمارات والكويت وقطر) تُحسَب بطريقة "أم القرى" حرفيًا،
     رغم أن مكتبة adhan.js توفّر طرقًا رسمية مخصصة لكل منها (Dubai/Kuwait/Qatar) بزوايا
     فجر/عشاء مختلفة قليلاً + إزاحات دقائق لبقية الأوقات. هذا الفرق (٣-٥ دقائق عادة) هو
     سبب ظهور مواقيت "غير صحيحة" مقارنة بالمصادر الرسمية المحلية في دبي/أبوظبي/الشارقة
     والكويت وقطر تحديدًا. */
  // Country → calculation method key
  const METHOD_MAP = {
    SA: 'UmmAlQura',
    AE: 'Dubai',
    KW: 'Kuwait',
    QA: 'Qatar',
    BH: 'UmmAlQura', OM: 'UmmAlQura', YE: 'UmmAlQura', IQ: 'UmmAlQura',
    EG: 'Egyptian',  SD: 'Egyptian',  LY: 'Egyptian',  MA: 'Egyptian',
    DZ: 'Egyptian',  TN: 'Egyptian',  SY: 'Egyptian',  JO: 'Egyptian',
    PS: 'Egyptian',  LB: 'Egyptian',
    IR: 'Tehran',
    TR: 'Turkey', AZ: 'Turkey',
    PK: 'Karachi', AF: 'Karachi', IN: 'Karachi', BD: 'Karachi',
    FR: 'MoonsightingCommittee', BE: 'MoonsightingCommittee',
    GB: 'MWL', IE: 'MWL', DE: 'MWL', NL: 'MWL', SE: 'MWL', NO: 'MWL',
    CA: 'NorthAmerica', US: 'NorthAmerica', MX: 'NorthAmerica',
    MY: 'Singapore', SG: 'Singapore', ID: 'Singapore',
  };

  const PRAYER_NAMES_AR = {
    fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر',
    asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
  };

  const PRAYER_ICONS = {
    fajr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      <line x1="3" y1="20" x2="21" y2="20"/>
    </svg>`,
    sunrise: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M12 7a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5z" fill="none"/>
      <path d="M7 12H3M21 12h-4M12 3V1M5.22 5.22 3.81 3.81M18.78 5.22l1.41-1.41"/>
      <line x1="3" y1="17" x2="21" y2="17"/>
    </svg>`,
    dhuhr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>`,
    asr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
    </svg>`,
    maghrib: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M12 19a7 7 0 0 1 0-14v0"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="17" x2="21" y2="17" opacity=".4"/>
    </svg>`,
    isha: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`,
  };

  /* v5: كانت تستخدم toISOString() أي تاريخ UTC، بينما "اليوم" الفعلي للمستخدم محلي —
     لمستخدم بتوقيت +4 (كدبي) هذا يعني أن الكاش لا يتجدد إلا بعد 4 ساعات من منتصف
     الليل المحلي فعليًا. الآن نبني تاريخًا محليًا صريحًا (Y-M-D) بدل UTC. */
  const todayKey = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };

  const getCache = (lat, lon, madhab) => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj.date !== todayKey()) return null;
      if (obj.madhab !== madhab) return null; /* v5: المذهب يغيّر توقيت العصر — يجب إبطال الكاش عند تغييره */
      if (Math.abs(obj.lat - lat) > 0.3 || Math.abs(obj.lon - lon) > 0.3) return null;
      return obj.prayers;
    } catch { return null; }
  };

  const setCache = (lat, lon, prayers, madhab) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), lat, lon, madhab, prayers }));
    } catch {}
  };

  const getAdhanParams = (methodKey) => {
    if (typeof adhan === 'undefined') throw new Error('adhan_unavailable');
    const M = adhan.CalculationMethod;
    const map = {
      UmmAlQura:             M.UmmAlQura(),
      Egyptian:              M.Egyptian(),
      Tehran:                M.Tehran(),
      Turkey:                M.Turkey(),
      Karachi:               M.Karachi(),
      MoonsightingCommittee: M.MoonsightingCommittee(),
      MWL:                   M.MuslimWorldLeague(),
      NorthAmerica:          M.NorthAmerica(),
      Singapore:             M.Singapore(),
      Dubai:                 M.Dubai(),
      Kuwait:                M.Kuwait(),
      Qatar:                 M.Qatar(),
    };
    return map[methodKey] || M.UmmAlQura();
  };

  const buildPrayerList = (times, fmt, fmtRaw, methodKey) =>
    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(key => {
      const dt = times[key];
      return {
        key,
        nameAr:    PRAYER_NAMES_AR[key],
        icon:      PRAYER_ICONS[key],
        timeStr:   fmt(dt),
        timeRaw:   fmtRaw(dt),
        ts:        dt.getTime(),
        methodKey,
        method:    'مواقيت الصلاة',  // Always display this label in Arabic
      };
    });

  const calcWithAdhan = (lat, lon, countryCode, timezone, madhab) => {
    if (typeof adhan === 'undefined') throw new Error('adhan_unavailable');
    const methodKey = METHOD_MAP[countryCode] || 'UmmAlQura';
    const coords = new adhan.Coordinates(lat, lon);
    const params = getAdhanParams(methodKey);
    /* v5: كان المذهب مثبَّتًا دائمًا على الشافعي بلا خيار — يؤثر مباشرة على توقيت العصر */
    params.madhab = madhab === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;

    const times = new adhan.PrayerTimes(coords, new Date(), params);

    const fmt = dt => {
      try {
        return dt.toLocaleTimeString('ar-SA', {
          hour: '2-digit', minute: '2-digit',
          timeZone: timezone, hour12: true,
        });
      } catch {
        return dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    };

    const fmtRaw = dt => {
      try {
        return dt.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit',
          timeZone: timezone, hour12: false,
        });
      } catch {
        return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    };

    return buildPrayerList(times, fmt, fmtRaw, methodKey);
  };

  const calcFromAPI = async (lat, lon, timezone, madhab) => {
    const now = new Date();
    const d = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
    const school = madhab === 'hanafi' ? 1 : 0;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    let r;
    try {
      r = await fetch(
        `https://api.aladhan.com/v1/timings/${d}?latitude=${lat}&longitude=${lon}&method=3&school=${school}`,
        { signal: ctrl.signal }
      );
    } finally {
      clearTimeout(timer);
    }
    if (!r.ok) throw new Error('aladhan_fail');
    const json = await r.json();
    const t = json.data.timings;

    /* v5: كانت هذه الدالة تتجاهل معامل tz تمامًا وتبني الوقت بتوقيت الجهاز المحلي —
       ما ينتج مواقيت خاطئة إن اختلف توقيت الجهاز عن توقيت الموقع الفعلي (سفر، أو جهاز
       بتوقيت مضبوط يدويًا). الآن نحوّل "HH:mm" (وهو بتوقيت الموقع كما يُرجعه Aladhan)
       إلى اللحظة الزمنية الصحيحة عالميًا (UTC) عبر معرفة إزاحة تلك المنطقة الزمنية فعليًا،
       بدل افتراض أنها تطابق توقيت الجهاز. */
    /* v5.2 — إصلاح جذري لخطأ حساب توقيت خاطئ يصل لعدة ساعات (وليس دقائق):
       الطريقة السابقة كانت تحوّل "HH:mm" عبر خدعة إعادة تفسير نص بواسطة new Date()،
       وهذه الخدعة تعتمد ضمنيًا على توقيت الجهاز المحلي نفسه لحساب الفرق — فإذا كان
       توقيت جهاز المستخدم مطابقًا لتوقيت موقعه الفعلي (وهي الحالة الأكثر شيوعًا بلا
       منازع)، كانت الدالة تحسب "فرقًا" يساوي صفرًا فتُرجع الوقت وكأنه UTC حرفيًا —
       ما يُنتج خطأ يساوي بالضبط فارق توقيت تلك المنطقة عن UTC (مثال مؤكَّد: +4 ساعات
       كاملة لمستخدمي الإمارات). الحل الصحيح: حساب إزاحة المنطقة الزمنية عن UTC مباشرة
       عبر Intl.DateTimeFormat().formatToParts()، وهي طريقة لا تعتمد إطلاقًا على توقيت
       جهاز المستخدم الخاص. */
    const getTzOffsetMinutes = (tz, atDate) => {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      const parts = {};
      dtf.formatToParts(atDate).forEach(p => { parts[p.type] = p.value; });
      const asUTC = Date.UTC(
        +parts.year, +parts.month - 1, +parts.day,
        +parts.hour, +parts.minute, +parts.second
      );
      return (asUTC - atDate.getTime()) / 60000; // بالدقائق، موجب إن كانت المنطقة متقدّمة عن UTC
    };

    const parseHHMM = (hhmm, tz) => {
      const [h, m] = hhmm.split(':').map(Number);
      const y = now.getFullYear(), mo = now.getMonth() + 1, day = now.getDate();
      if (!tz) {
        const dt = new Date();
        dt.setFullYear(y, mo - 1, day);
        dt.setHours(h, m, 0, 0);
        return dt;
      }
      const naiveUTC = Date.UTC(y, mo - 1, day, h, m); // "h:m" وكأنها UTC حرفيًا (خطوة وسيطة فقط)
      try {
        const offsetMin = getTzOffsetMinutes(tz, new Date(naiveUTC));
        return new Date(naiveUTC - offsetMin * 60000);
      } catch {
        const dt = new Date();
        dt.setFullYear(y, mo - 1, day);
        dt.setHours(h, m, 0, 0);
        return dt;
      }
    };

    const fmt = hhmm => {
      const dt = parseHHMM(hhmm, timezone);
      try {
        return dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: true });
      } catch {
        return dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    };
    const fmtRaw = hhmm => {
      const dt = parseHHMM(hhmm, timezone);
      try {
        return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false });
      } catch {
        return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    };

    return ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(k => {
      const key = k.toLowerCase();
      return {
        key,
        nameAr:    PRAYER_NAMES_AR[key],
        icon:      PRAYER_ICONS[key],
        timeStr:   fmt(t[k]),
        timeRaw:   fmtRaw(t[k]),
        ts:        parseHHMM(t[k], timezone).getTime(),
        methodKey: 'API',
        method:    'مواقيت الصلاة',
      };
    });
  };

  /* v5.1: التحقق أن مواقيت الصلاة الستة منطقية ومتسلسلة زمنيًا (كل صلاة بعد التي تسبقها)
     كما طُلب صراحة — هذا يحمي من عرض مواقيت فاسدة لو حدث خلل في المكتبة أو في استجابة
     الـ API الاحتياطي (مثلاً بسبب تحويل توقيت خاطئ) بدل عرضها للمستخدم دون تحقق. */
  const isSequential = prayers => {
    if (!Array.isArray(prayers) || prayers.length !== 6) return false;
    for (let i = 1; i < prayers.length; i++) {
      if (!(prayers[i].ts > prayers[i - 1].ts)) return false;
    }
    return true;
  };

  const getPrayers = async (lat, lon, countryCode = 'SA', timezone = 'UTC', madhab = 'shafi') => {
    const hit = getCache(lat, lon, madhab);
    if (hit && isSequential(hit)) return hit;

    let prayers = null;
    try {
      const viaAdhan = calcWithAdhan(lat, lon, countryCode, timezone, madhab);
      if (isSequential(viaAdhan)) prayers = viaAdhan;
    } catch { /* adhan.js غير متاح — جرّب الـ API الاحتياطي أدناه */ }

    if (!prayers) {
      try {
        const viaAPI = await calcFromAPI(lat, lon, timezone, madhab);
        if (isSequential(viaAPI)) prayers = viaAPI;
      } catch { /* فشل الـ API أيضًا — سيُرجَع null أدناه */ }
    }

    if (!prayers) return null;

    setCache(lat, lon, prayers, madhab);
    return prayers;
  };

  const getNextPrayer = prayers => {
    if (!prayers?.length) return null;
    const now = Date.now();
    const upcoming = prayers.filter(p => p.key !== 'sunrise' && p.ts > now);
    if (upcoming.length) return upcoming[0];
    // All passed → next is Fajr tomorrow
    const fajr = prayers.find(p => p.key === 'fajr');
    if (fajr) return { ...fajr, ts: fajr.ts + 86400000 };
    return null;
  };

  const formatCountdown = ms => {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const z = n => String(n).padStart(2, '0');
    return `${z(h)}:${z(m)}:${z(sec)}`;
  };

  return { getPrayers, getNextPrayer, formatCountdown };
})();
