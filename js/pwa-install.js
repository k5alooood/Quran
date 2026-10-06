/* Quran Kareem Direct — PWA Install Assistant v24 */
(() => {
  'use strict';

  let deferredPrompt = null;
  let manualMode = false;
  const KEY = 'quran-pwa-install-dismissed-v24';
  const DAY = 14 * 24 * 60 * 60 * 1000; /* فترة احترام الإغلاق: 14 يومًا (كانت يومًا واحدًا — مزعجة) */
  const $ = (id) => document.getElementById(id);

  /* ───── توقيت العرض بحسب النية (بدل مؤقت ثابت) ─────
     يظهر البانر فقط بعد: (أ) بدء استماع فعلي + 20 ثانية، أو (ب) الزيارة الثانية فصاعدًا + 8 ثوانٍ.
     «الزيارة» تُعدّ مرة لكل جلسة وتُخزَّن محليًا فقط (qr_visits) — لا تتبّع ولا شبكة. */
  const VISITS_KEY = 'qr_visits';
  const PLAY_DELAY = 20000;
  const RETURN_DELAY = 8000;
  let engaged = false;
  let timerId = null;

  function countVisit() {
    try {
      if (sessionStorage.getItem('qr_visit_counted')) return;
      sessionStorage.setItem('qr_visit_counted', '1');
      localStorage.setItem(VISITS_KEY, String((Number(localStorage.getItem(VISITS_KEY)) || 0) + 1));
    } catch (_) {}
  }
  function visits() {
    try { return Number(localStorage.getItem(VISITS_KEY)) || 0; } catch (_) { return 0; }
  }
  function schedule(ms) {
    if (timerId !== null) window.clearTimeout(timerId);
    timerId = window.setTimeout(() => { timerId = null; presentPrompt(); }, ms);
  }
  function presentPrompt() {
    if (isStandalone() || wasDismissed()) return;
    if (deferredPrompt) {
      showPrompt('ثبّت القرآن الكريم', 'استمع بسرعة من الشاشة الرئيسية بدون فتح المتصفح كل مرة.', 'تثبيت');
    } else if (isIOS) {
      showPrompt('ثبّت القرآن الكريم', 'اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية» للوصول إليه مثل أي تطبيق.', 'طريقة التثبيت', true);
    } else {
      showPrompt('ثبّت القرآن الكريم', 'أضفه إلى الشاشة الرئيسية للاستماع بشكل أسرع وأسهل.', 'طريقة التثبيت', true);
    }
  }
  document.addEventListener('qr:played', () => {
    if (engaged) return;
    engaged = true;
    schedule(PLAY_DELAY);
  });
  countVisit();

  const promptEl = () => $('pwaInstallPrompt');
  const installBtn = () => $('pwaInstallButton');
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function wasDismissed() {
    try {
      const stamp = Number(localStorage.getItem(KEY));
      return Number.isFinite(stamp) && Date.now() - stamp < DAY;
    } catch (_) { return false; }
  }

  function markDismissed() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {}
  }

  function showPrompt(title, copy, buttonText = 'تثبيت', manual = false) {
    const el = promptEl();
    if (!el || isStandalone() || wasDismissed() || isAnyModalOpen()) return;

    manualMode = manual;
    $('pwaInstallTitle')?.replaceChildren(document.createTextNode(title));
    el.querySelector('.pwa-install-copy span')?.replaceChildren(document.createTextNode(copy));
    if (installBtn()) installBtn().textContent = buttonText;

    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visible')));
  }

  /* لا نُظهر بانر التثبيت فوق أي شاشة ملء-شاشة أخرى (وضع التركيز / بوصلة القبلة) —
     يتحقق قبل العرض، ويُخفي البانر تلقائيًا إن كان ظاهرًا بالفعل عند فتح إحداها */
  function isAnyModalOpen() {
    const fdiv = $('fdiv');
    const qibla = $('qiblaScreen');
    return (fdiv && !fdiv.classList.contains('hidden')) ||
           (qibla && !qibla.classList.contains('hidden'));
  }

  function hidePrompt(save = false) {
    const el = promptEl();
    if (!el) return;
    el.classList.remove('is-visible');
    window.setTimeout(() => { el.hidden = true; }, 240);
    if (save) markDismissed();
  }

  async function handleInstallClick() {
    if (manualMode || !deferredPrompt) {
      hidePrompt(true);
      return;
    }

    deferredPrompt.prompt();
    try {
      const result = await deferredPrompt.userChoice;
      if (result?.outcome === 'accepted') hidePrompt(false);
      else hidePrompt(true);
    } finally {
      deferredPrompt = null;
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    /* لا نعرض البانر فورًا؛ يُعرض بحسب النية (انظر schedule) */
    if (engaged || visits() >= 2) schedule(engaged ? PLAY_DELAY : RETURN_DELAY);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    manualMode = false;
    hidePrompt(false);
  });

  document.addEventListener('DOMContentLoaded', () => {
    $('pwaInstallClose')?.addEventListener('click', () => hidePrompt(true));
    installBtn()?.addEventListener('click', handleInstallClick);

    /* إخفاء فوري ومؤقت (بدون تعليم "تم الرفض") إن كان البانر ظاهرًا بالفعل
       لحظة فتح وضع التركيز أو بوصلة القبلة — تجربة الشاشة الكاملة أولوية.
       نراقب تغيّر كلاس "hidden" على الشاشتين مباشرة بدل الاعتماد على أحداث نقر
       قد لا تلتقط لحظة الفتح فعليًا (الفتح قد يحدث برمجيًا أيضًا) */
    const watchModal = id => {
      const el = $(id);
      if (!el) return;
      new MutationObserver(() => {
        if (!el.classList.contains('hidden')) {
          const prompt = promptEl();
          if (prompt && prompt.classList.contains('is-visible')) hidePrompt(false);
        }
      }).observe(el, { attributes: true, attributeFilter: ['class'] });
    };
    watchModal('fdiv');
    watchModal('qiblaScreen');

    if (visits() >= 2 && !engaged) schedule(RETURN_DELAY);
  });

  /* واجهة عامة صغيرة تسمح لشاشة الإعدادات بإعادة استدعاء نفس منطق التثبيت
     الحقيقي (نفس الشرط: تثبيت أصلي إن كان متاحًا، وإلا نفس إرشاد iOS/Android
     اليدوي المستخدم تلقائيًا) — لا منطق تثبيت جديد، فقط نقطة استدعاء يدوية. */
  window.QuranPWAInstall = {
    isInstalled: isStandalone,
    showManual: function () {
      if (isStandalone()) return false;
      if (deferredPrompt) { handleInstallClick(); return true; }
      if (isIOS) {
        showPrompt('ثبّت القرآن الكريم', 'اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية» للوصول إليه مثل أي تطبيق.', 'طريقة التثبيت', true);
      } else {
        showPrompt('ثبّت القرآن الكريم', 'أضفه إلى الشاشة الرئيسية للاستماع بشكل أسرع وأسهل.', 'طريقة التثبيت', true);
      }
      return true;
    }
  };
})();
