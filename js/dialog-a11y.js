/* DialogA11y — إدارة التركيز للحوارات المعتمة (aria-modal):
   عند الفتح: ينتقل التركيز إلى داخل الحوار ويُحصر Tab/Shift+Tab فيه؛
   عند الإغلاق: يعود التركيز إلى العنصر الذي فتحه (أو بديله إن كان مخفيًا).
   مسؤولية واحدة، بلا اعتمادية على بقية الوحدات. */
(function () {
  'use strict';

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  var stack = [];

  function isVisible(el) {
    return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  }

  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), isVisible);
  }

  function safeFocus(el) {
    if (!el || typeof el.focus !== 'function' || !document.contains(el)) return false;
    try { el.focus({ preventScroll: true }); } catch (e) { return false; }
    return document.activeElement === el;
  }

  function open(root, opts) {
    if (!root) return;
    opts = opts || {};
    close(root, { restore: false }); /* آمن عند الاستدعاء المتكرر */
    var entry = { root: root, opener: opts.opener || document.activeElement, fallback: opts.fallback || null, onKey: null };
    entry.onKey = function (e) {
      if (e.key !== 'Tab') return;
      var list = focusables(root);
      if (!list.length) { e.preventDefault(); return; }
      var first = list[0], last = list[list.length - 1], active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !root.contains(active))) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener('keydown', entry.onKey);
    stack.push(entry);
    /* ننتظر إطارًا ليصبح الحوار ظاهرًا (إزالة hidden) قبل طلب التركيز */
    requestAnimationFrame(function () {
      var target = (opts.initial && root.querySelector(opts.initial)) || focusables(root)[0];
      if (!target) {
        if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
        target = root;
      }
      safeFocus(target);
    });
  }

  function close(root, opts) {
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].root !== root) continue;
      var entry = stack.splice(i, 1)[0];
      root.removeEventListener('keydown', entry.onKey);
      if (!(opts && opts.restore === false)) {
        if (!safeFocus(entry.opener) || !isVisible(entry.opener)) safeFocus(entry.fallback);
      }
      return;
    }
  }

  window.DialogA11y = { open: open, close: close };
})();
