/* Quran Kareem Direct — PWA Install Assistant v24 */
(() => {
  'use strict';

  let deferredPrompt = null;
  let manualMode = false;
  const KEY = 'quran-pwa-install-dismissed-v24';
  const DAY = 24 * 60 * 60 * 1000;
  const $ = (id) => document.getElementById(id);

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
    if (!el || isStandalone() || wasDismissed()) return;

    manualMode = manual;
    $('pwaInstallTitle')?.replaceChildren(document.createTextNode(title));
    el.querySelector('.pwa-install-copy span')?.replaceChildren(document.createTextNode(copy));
    if (installBtn()) installBtn().textContent = buttonText;

    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visible')));
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
    showPrompt(
      'ثبّت القرآن الكريم',
      'استمع بسرعة من الشاشة الرئيسية بدون فتح المتصفح كل مرة.',
      'تثبيت'
    );
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    manualMode = false;
    hidePrompt(false);
  });

  document.addEventListener('DOMContentLoaded', () => {
    $('pwaInstallClose')?.addEventListener('click', () => hidePrompt(true));
    installBtn()?.addEventListener('click', handleInstallClick);

    window.setTimeout(() => {
      if (isStandalone() || wasDismissed() || deferredPrompt) return;

      if (isIOS) {
        showPrompt(
          'ثبّت القرآن الكريم',
          'اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية» للوصول إليه مثل أي تطبيق.',
          'طريقة التثبيت',
          true
        );
      } else {
        showPrompt(
          'ثبّت القرآن الكريم',
          'أضفه إلى الشاشة الرئيسية للاستماع بشكل أسرع وأسهل.',
          'طريقة التثبيت',
          true
        );
      }
    }, 2400);
  });
})();
