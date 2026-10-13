/* stream-check.js — v5.8.1: أداة فحص روابط البث من متصفحك الحقيقي.
   تقرأ قائمة STATIONS من js/app.js نفسه (فلا تنحرف عن التطبيق)، وتختبر كل محطة بنفس محرّك التشغيل:
   hls.js لروابط ‎.m3u8‎ وعنصر Audio للباقي، ثم الخادم الاحتياطي (bk) إن فشل الأساسي، وتسجّل انتهاكات CSP أثناء كل فحص.
   معيار النجاح: وصل تشغيل الصوت إلى ثانية واحدة فعليًا (timeupdate) خلال المهلة — لا مجرد استجابة HTTP. */
(function () {
  'use strict';
  var TIMEOUT = 14000;      /* مهلة الفحص الواحد */
  var PLAY_SECONDS = 1.0;   /* يجب أن يتقدّم زمن التشغيل فعليًا هذا القدر */
  var ERR_NAMES = ['', 'ABORTED', 'NETWORK', 'DECODE', 'SRC_NOT_SUPPORTED'];

  var $ = function (id) { return document.getElementById(id); };
  var stations = [], results = {}, customResults = [], running = false, cancel = false;

  /* ---------- قراءة المحطات من app.js ---------- */
  function parseStations(src) {
    var i = src.indexOf('var STATIONS'), j = src.indexOf('];', i), out = [];
    if (i < 0 || j < 0) return out;
    var blk = src.slice(i, j), re = /\{id:'([^']+)',\s*name:'([^']+)'[\s\S]*?url:'([^']+)'[\s\S]*?bk:'([^']*)'/g, m;
    while ((m = re.exec(blk))) out.push({ id: m[1], name: m[2], url: m[3], bk: m[4] });
    return out;
  }

  /* ---------- فحص رابط واحد ---------- */
  function probe(url) {
    return new Promise(function (resolve) {
      var started = Date.now(), done = false, csp = [], hosts = {}, hls = null, engine = 'audio', httpCode = null;
      var audio = new Audio();
      audio.muted = true; audio.preload = 'auto';
      function onV(e) { csp.push(e.violatedDirective + ' ← ' + e.blockedURI); }
      document.addEventListener('securitypolicyviolation', onV);
      var tm = setTimeout(function () { finish(false, 'انتهت المهلة (' + (TIMEOUT / 1000) + 'ث) دون صوت'); }, TIMEOUT);
      function finish(ok, why) {
        if (done) return; done = true;
        clearTimeout(tm); document.removeEventListener('securitypolicyviolation', onV);
        try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (_) {}
        if (hls) { try { hls.destroy(); } catch (_) {} }
        resolve({ url: url, ok: ok, ms: Date.now() - started, engine: engine, detail: why, csp: csp, segHosts: Object.keys(hosts), http: httpCode });
      }
      audio.addEventListener('timeupdate', function () { if (audio.currentTime >= PLAY_SECONDS) finish(true, 'يعمل'); });
      audio.addEventListener('error', function () {
        var c = audio.error ? audio.error.code : 0;
        finish(false, 'خطأ وسائط ' + c + ' (' + (ERR_NAMES[c] || '?') + ')');
      });
      function tryPlay() {
        var p = audio.play();
        if (p && p.catch) p.catch(function (e) { if (e && e.name !== 'AbortError') finish(false, 'رفض التشغيل: ' + e.name); });
      }
      if (/\.m3u8(\?|$)/.test(url) && window.Hls && window.Hls.isSupported()) {
        engine = 'hls.js';
        hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
        hls.on(window.Hls.Events.FRAG_LOADING, function (_e, d) { try { hosts[new URL(d.frag.url).host] = 1; } catch (_) {} });
        hls.on(window.Hls.Events.MANIFEST_PARSED, tryPlay);
        hls.on(window.Hls.Events.ERROR, function (_e, d) {
          if (!d.fatal) return;
          httpCode = d.response && d.response.code ? d.response.code : null;
          finish(false, 'hls.js: ' + d.type + ' / ' + d.details + (httpCode ? ' (HTTP ' + httpCode + ')' : ''));
        });
        hls.loadSource(url); hls.attachMedia(audio);
      } else if (/\.m3u8(\?|$)/.test(url)) {
        engine = 'native-hls'; audio.src = url; tryPlay();
      } else {
        audio.src = url; tryPlay();
      }
    });
  }

  /* ---------- فحص محطة (أساسي ثم احتياطي) ---------- */
  function checkStation(st) {
    return probe(st.url).then(function (a) {
      if (a.ok || !st.bk || st.bk === st.url) return { st: st, a: a, b: null };
      return probe(st.bk).then(function (b) { return { st: st, a: a, b: b }; });
    });
  }
  function verdict(r) {
    if (r.a.ok) return { k: 'ok', t: 'يعمل' };
    if (r.b && r.b.ok) return { k: 'warn', t: 'الأساسي لا يعمل — يعمل عبر الاحتياطي' };
    return { k: 'bad', t: 'لا يعمل' };
  }

  /* ---------- التقرير ---------- */
  function line(label, p) {
    if (!p) return '  ' + label + ': —';
    return '  ' + label + ': ' + (p.ok ? 'OK' : 'FAIL') + ' | ' + p.engine + ' | ' + p.ms + 'ms | ' + p.detail +
      (p.segHosts.length ? ' | segments: ' + p.segHosts.join(',') : '') + (p.csp.length ? ' | CSP: ' + p.csp.slice(0, 3).join(' ; ') : '') + '\n    ' + p.url;
  }
  function buildReport() {
    var ok = 0, warn = 0, bad = 0, untested = 0, cspAll = {}, segHosts = {}, out = [];
    stations.forEach(function (st) {
      var r = results[st.id];
      if (!r) { untested++; out.push('[ ] ' + st.id + ' — ' + st.name + ' — لم تُفحص'); return; }
      var v = verdict(r);
      if (v.k === 'ok') ok++; else if (v.k === 'warn') warn++; else bad++;
      [r.a, r.b].forEach(function (p) { if (p) { p.csp.forEach(function (c) { cspAll[c] = 1; }); p.segHosts.forEach(function (h) { segHosts[h] = 1; }); } });
      out.push((v.k === 'ok' ? '[OK] ' : v.k === 'warn' ? '[BACKUP] ' : '[FAIL] ') + st.id + ' — ' + st.name + ' — ' + v.t + '\n' + line('الأساسي', r.a) + '\n' + line('الاحتياطي', r.b));
    });
    var nav = navigator, conn = nav.connection ? (nav.connection.effectiveType + ' / downlink ' + nav.connection.downlink) : 'n/a';
    return 'تقرير فحص روابط البث — ' + new Date().toISOString() + '\n' +
      'الموقع: ' + location.origin + ' | المتصفح: ' + nav.userAgent + '\nالاتصال: ' + (nav.onLine ? 'online' : 'OFFLINE') + ' | ' + conn + '\n' +
      'الملخص: يعمل ' + ok + ' | عبر الاحتياطي فقط ' + warn + ' | لا يعمل ' + bad + ' | لم تُفحص ' + untested + ' من ' + stations.length + '\n' +
      'نطاقات مقاطع HLS المرصودة: ' + (Object.keys(segHosts).join(', ') || '—') + '\n' +
      'انتهاكات CSP: ' + (Object.keys(cspAll).join(' ; ') || 'لا شيء') + '\n\n' + out.join('\n\n') + '\n' +
      (customResults.length ? '\nروابط مخصّصة:\n' + customResults.map(function (c) { return (c.ok ? '[OK] ' : '[FAIL] ') + c.url + '\n' + line('النتيجة', c); }).join('\n\n') + '\n' : '');
  }

  /* ---------- الواجهة ---------- */
  function render() {
    var list = $('list'); list.replaceChildren();
    var ok = 0, warn = 0, bad = 0;
    stations.forEach(function (st) {
      var r = results[st.id], card = document.createElement('div'); card.className = 'card'; card.id = 'c_' + st.id;
      var h = document.createElement('h2'), name = document.createElement('span'), tag = document.createElement('span');
      name.textContent = st.name; tag.className = 'tag idle'; tag.textContent = 'لم تُفحص';
      var body = document.createElement('div');
      if (r) {
        var v = verdict(r); tag.className = 'tag ' + v.k; tag.textContent = v.t;
        if (v.k === 'ok') ok++; else if (v.k === 'warn') warn++; else bad++;
        [['الأساسي', r.a], ['الاحتياطي', r.b]].forEach(function (x) {
          if (!x[1]) return;
          var d = document.createElement('div'); d.className = 'line';
          var b = document.createElement('b'); b.textContent = x[0] + ': ';
          d.appendChild(b);
          d.appendChild(document.createTextNode((x[1].ok ? '✓ ' : '✗ ') + x[1].engine + ' · ' + x[1].ms + 'ms · ' + x[1].detail + (x[1].csp.length ? ' · CSP: ' + x[1].csp[0] : '') + ' — ' + x[1].url));
          body.appendChild(d);
        });
      } else {
        var d0 = document.createElement('div'); d0.className = 'line'; d0.textContent = st.url; body.appendChild(d0);
      }
      var again = document.createElement('button'); again.type = 'button'; again.textContent = 'أعد فحص هذه المحطة'; again.disabled = running;
      again.addEventListener('click', function () { runOne(st); });
      h.appendChild(name); h.appendChild(tag); card.appendChild(h); card.appendChild(body); card.appendChild(again);
      list.appendChild(card);
    });
    var sum = $('sum'); sum.replaceChildren();
    [['ok', 'يعمل ' + ok], ['warn', 'عبر الاحتياطي ' + warn], ['bad', 'لا يعمل ' + bad]].forEach(function (x) {
      var s = document.createElement('span'); s.className = 'pill ' + x[0]; s.textContent = x[1]; sum.appendChild(s);
    });
    $('report').value = buildReport();
  }
  function setRunning(v) { running = v; $('runAll').disabled = v; $('stop').disabled = !v; }
  function runOne(st) {
    if (running) return Promise.resolve();
    setRunning(true); $('status').textContent = 'جارِ فحص: ' + st.name + '…';
    return checkStation(st).then(function (r) { results[st.id] = r; }).then(function () { setRunning(false); $('status').textContent = 'انتهى فحص: ' + st.name; render(); });
  }
  function runAll() {
    if (running) return;
    cancel = false; setRunning(true); results = {}; render();
    var i = 0;
    (function next() {
      if (cancel || i >= stations.length) { setRunning(false); $('status').textContent = cancel ? 'أُوقف الفحص' : 'اكتمل الفحص — انسخ التقرير وأرسله'; render(); return; }
      var st = stations[i++];
      $('status').textContent = 'جارِ فحص (' + i + '/' + stations.length + '): ' + st.name + '…';
      checkStation(st).then(function (r) { results[st.id] = r; render(); next(); });
    })();
  }
  function copyReport() {
    var t = $('report').value || buildReport();
    function fallback() { $('report').removeAttribute('readonly'); $('report').select(); try { document.execCommand('copy'); } catch (_) {} $('report').setAttribute('readonly', ''); $('status').textContent = 'نُسخ التقرير'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { $('status').textContent = 'نُسخ التقرير'; }, fallback); else fallback();
  }

  /* اختبار رابط مخصّص يلصقه المستخدم (مثلًا بث رسمي وجده من لسان Network) */
  function runCustom() {
    var u = ($('customUrl').value || '').trim(), out = $('customOut');
    if (!/^https?:\/\//i.test(u)) { out.textContent = 'أدخل رابطًا يبدأ بـ https://'; return; }
    if (/^http:\/\//i.test(u) && location.protocol === 'https:') { out.textContent = 'الرابط http غير مشفّر: سيحجبه المتصفح داخل موقع https (محتوى مختلط). ابحث عن نسخته https.'; }
    $('customRun').disabled = true; out.textContent = 'جارِ الاختبار…';
    probe(u).then(function (r) {
      customResults.push(r);
      out.textContent = (r.ok ? '✓ يعمل — ' : '✗ لا يعمل — ') + r.engine + ' · ' + r.ms + 'ms · ' + r.detail + (r.segHosts.length ? ' · مقاطع: ' + r.segHosts.join(',') : '') + (r.csp.length ? ' · CSP: ' + r.csp[0] : '');
      $('customRun').disabled = false; $('report').value = buildReport();
    });
  }

  function init() {
    $('customRun').addEventListener('click', runCustom);
    $('runAll').addEventListener('click', runAll);
    $('stop').addEventListener('click', function () { cancel = true; });
    $('copy').addEventListener('click', copyReport);
    fetch('../js/app.js', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (src) {
      stations = parseStations(src);
      $('status').textContent = stations.length ? 'جاهز: ' + stations.length + ' محطة. اضغط «ابدأ».' : 'تعذّر قراءة قائمة المحطات من js/app.js';
      render();
    }).catch(function () { $('status').textContent = 'تعذّر تحميل js/app.js'; });
  }
  window.StreamCheck = { probe: probe, parseStations: parseStations, checkStation: checkStation, verdict: verdict };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
