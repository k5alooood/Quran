/* boot.js — v5.8: يحلّ محل كل ما كان مضمّنًا في <head> (سكربت الثيم، onload الخط، onerror لـ adhan)
   كي تعمل سياسة CSP بـ script-src 'self' بلا 'unsafe-inline'. يُحمَّل متزامنًا أول <head> وهو صغير جدًا
   (لتفادي وميض الثيم الخاطئ قبل أول رسم). */
(function(){
  /* (1) الثيم المحفوظ قبل أول رسم — نفس منطق السكربت المضمّن القديم تمامًا */
  try {
    var saved = localStorage.getItem('qr_theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.setAttribute('data-theme', saved);
  } catch (_) {}

  /* (2) فشل تحميل vendor/adhan: أحداث error لا تطفو، فنلتقطها في مرحلة الـcapture على window */
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT' && /adhan/.test(t.src || '')) window.__adhanLoadFailed = true;
  }, true);

  /* (3) الخط غير الحاجب للرسم: الرابط يبدأ media="print" ثم يُحوَّل إلى all عند اكتمال تحميله.
     حدث load للروابط لا يطفو أيضًا، فنستمع له بالـcapture؛ وعند load للنافذة شبكة أمان إن فاتنا الحدث */
  document.addEventListener('load', function (e) {
    var t = e.target;
    if (t && t.tagName === 'LINK' && t.hasAttribute('data-async-font')) t.media = 'all';
  }, true);
  window.addEventListener('load', function () {
    var l = document.querySelectorAll('link[data-async-font]');
    for (var i = 0; i < l.length; i++) l[i].media = 'all';
  });
})();
