/* Quran Radio v20 — isolated UX enhancements */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    // Smooth anchor navigation without changing existing app handlers.
    // v5: استُثنيت روابط .bnav-item لأن app.js (setupBnav) لديها بالفعل معالج نقر
    // مخصص يستدعي scrollIntoView مع preventDefault — كان هذا المعالج العام يُشغّل
    // نفس التمرير مرة ثانية بلا تنسيق، ما يسبب ازدواجية غير ضرورية.
    document.querySelectorAll('a[href^="#"]:not(.bnav-item)').forEach(function (a) {
      a.addEventListener('click', function () {
        var id = a.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        try { target.scrollIntoView({behavior:'smooth', block:'start'}); } catch (_) {}
      }, {passive:true});
    });

    // Small tactile feedback on supported devices.
    document.querySelectorAll('button, .bnav-item, .st-item').forEach(function (el) {
      el.addEventListener('click', function () {
        if (navigator.vibrate) navigator.vibrate(8);
      }, {passive:true});
    });

    // Mark the document when the app is running in standalone/PWA mode.
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      document.documentElement.classList.add('is-pwa');
    }

    // Keep the mini-player and page bottom padding clear of the floating dock.
    // مهم: يجب ضبط المتغيّر على <html> (جذر المستند) لا على #mini نفسه —
    // متغيّرات CSS تتوارث من الأصل إلى الأبناء فقط، وbody هو أصل لعنصر #mini
    // وليس العكس، فلو ضُبط على #mini لَما استطاع body أو .wrap قراءته أبدًا.
    function setPlayerOffset() {
      var nav = document.getElementById('bnav');
      if (!nav) return;
      var navH = nav.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--dock-height', Math.ceil(navH) + 'px');
    }
    setPlayerOffset();
    window.addEventListener('resize', setPlayerOffset, {passive:true});
    window.addEventListener('orientationchange', function(){ setTimeout(setPlayerOffset, 120); });
    if ('ResizeObserver' in window) {
      var navEl = document.getElementById('bnav');
      if (navEl) new ResizeObserver(setPlayerOffset).observe(navEl);
    }
  });
})();
