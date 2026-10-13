"""اختبارات v5.8.0: الأمان (CSP صارمة بلا inline، لا innerHTML)، إمكانية الوصول (aria-pressed/aria-modal/theme-color)،
الروابط العميقة وزر التشغيل، appinstalled، الـService Worker.
تشغيل:  python3 tests/e2e/inline_handlers.py   — Chromium + API مُحاكى."""
import json, os, re, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8896'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8896/index.html'
LOC = {"ts": int(time.time() * 1000), "data": {"lat": 25.2, "lon": 55.3, "city": "دبي", "country": "الإمارات العربية المتحدة", "countryCode": "AE", "timezone": "Asia/Dubai", "src": "ip"}}
res = []


def check(n, ok, d=''):
    res.append((n, bool(ok), d))


def route(block_adhan=False):
    def r(req):
        u = req.request.url
        if block_adhan and 'adhan' in u:
            return req.abort()
        return req.continue_() if '127.0.0.1' in u else req.abort()
    return r


def page(b, w=390, h=844, touch=False, loc=True, extra='', block_adhan=False, theme='light'):
    kw = {'has_touch': True, 'is_mobile': True} if touch else {}
    ctx = b.new_context(viewport={'width': w, 'height': h}, **kw)
    ctx.route('**/*', route(block_adhan))
    pg = ctx.new_page()
    pg.set_default_timeout(5000)
    pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)[:100]))
    init = "if(!sessionStorage.getItem('_s')){sessionStorage.setItem('_s','1');localStorage.setItem('qr_theme','%s');localStorage.setItem('quran-pwa-install-dismissed-v24',String(Date.now()));%s%s}" % (theme, ("localStorage.setItem('qr_location_v3',%s);" % json.dumps(json.dumps(LOC))) if loc else '', extra)
    pg.add_init_script(init)
    pg.goto(B)
    pg.wait_for_timeout(2300)
    return ctx, pg



import re
JSDIR = os.path.join(ROOT, 'js')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()


def strip_comments(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    return re.sub(r'(?m)(?<![:\'"`\\])//[^\n]*', '', s)

# ---------------- ثابتة: HTML
check('index.html: no inline event-handler attributes (onclick/onload/onerror/...)', not re.findall(r'\son[a-z]+\s*=\s*["\']', html), re.findall(r'\son[a-z]+\s*=\s*["\'][^"\']{0,40}', html)[:3])
inline_scripts = [m.group(1) for m in re.finditer(r'<script([^>]*)>', html) if 'src=' not in m.group(1) and 'ld+json' not in m.group(1)]
check('index.html: no executable inline <script> blocks (only JSON-LD data)', not inline_scripts, inline_scripts)
m = re.search(r'<meta[^>]*Content-Security-Policy[^>]*content="([^"]*)"', html)
csp = m.group(1) if m else ''
check("CSP present: default-src 'self', script-src 'self' without unsafe-inline/unsafe-eval", "default-src 'self'" in csp and re.search(r"script-src 'self'(?:;|$)", csp) and 'unsafe-eval' not in csp and not re.search(r"script-src[^;]*unsafe-inline", csp), csp[:120])
check("CSP: object-src 'none', base-uri 'self', form-action 'none', worker-src allows blob (hls.js)", all(x in csp for x in ["object-src 'none'", "base-uri 'self'", "form-action 'none'", 'worker-src']) and 'blob:' in csp)
check("CSP connect-src = 'self' https: (HLS segment hosts cannot be enumerated; a missing host = a silent station)", re.search(r"connect-src 'self' https:(?:;|$)", csp) is not None, csp[:200])
hosts = set()
for f in [x for x in os.listdir(JSDIR) if x.endswith('.js')]:
    t = strip_comments(open(os.path.join(JSDIR, f), encoding='utf-8').read())
    for mm in re.finditer(r"fetch\(\s*[`'\"]https://([A-Za-z0-9.\-]+)", t):
        hosts.add(mm.group(1))
    for mm in re.finditer(r"url\s*:\s*[`'\"]https://([A-Za-z0-9.\-]+)", t):
        hosts.add(mm.group(1))


def covered(h):
    return re.search(r"connect-src[^;]*\shttps:(?=[\s;]|$)", csp) is not None or ('https://' + h) in csp


check('every host fetched by JS is allowed by connect-src (' + ', '.join(sorted(hosts)) + ')', all(covered(h) for h in hosts), [h for h in hosts if not covered(h)])

# ---------------- ثابتة: JS
bad = {}
onattr = {}
for f in sorted(x for x in os.listdir(JSDIR) if x.endswith('.js')):
    code = strip_comments(open(os.path.join(JSDIR, f), encoding='utf-8').read())
    hits = re.findall(r'\.(?:innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\s*\(|document\.write\s*\(|\beval\s*\(|new Function\s*\(', code)
    if hits:
        bad[f] = hits
    h2 = re.findall(r"\bon(?:click|error|load|change)\s*=\s*\\?[\"']", code)
    if h2:
        onattr[f] = h2
check('JS: no innerHTML/outerHTML assignment, insertAdjacentHTML, document.write, eval or new Function anywhere', not bad, bad)
check('JS: no inline on* attributes inside generated markup strings', not onattr, onattr)
sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
check('sw.js: strategy doc header present, offline page only for navigations, audio/video never enter page logic', 'سجلّ الاستراتيجية' in sw and "request.mode !== 'navigate'" in sw and "destination === 'audio'" in sw and "destination === 'video'" in sw)
check('sw.js: new boot/sw-register/safe-dom files are in the precache list', all(x in sw for x in ["'./js/boot.js'", "'./js/sw-register.js'", "'./js/safe-dom.js'"]))
mf = json.load(open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8'))
check('manifest: display_override order standalone, minimal-ui, window-controls-overlay', mf['display_override'] == ['standalone', 'minimal-ui', 'window-controls-overlay'], mf['display_override'])
css = open(os.path.join(ROOT, 'css', 'styles.min.css'), encoding='utf-8').read()
check('css: --meta-theme-color defined (dark + light) and deprecated aliases documented', '--meta-theme-color:#0e0d0a' in css and '--meta-theme-color:#f0f1ee' in css and css.count('DEPRECATED: use') >= 7)
check('css: .vslider has no dead background-image declaration', 'background-image:linear-gradient(to right,var(--gold) var(--val,80%),var(--gdim)' not in css)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------------- ديناميكي: لا انتهاكات CSP أثناء الاستخدام الفعلي
    try:
        ctx, pg = page(b, touch=True)
        pg.evaluate("document.addEventListener('securitypolicyviolation',e=>{(window.__v=window.__v||[]).push(e.violatedDirective+'|'+e.blockedURI.slice(0,50))})")
        pg.evaluate("document.getElementById('menuBtn').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.getElementById('menuBtn').click()"); pg.wait_for_timeout(100)
        pg.evaluate("document.getElementById('reciteCard').scrollIntoView()"); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelector('[data-qibla-open]').click()"); pg.wait_for_timeout(1200)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelector('#azCard .zi-btn').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.getElementById('worshipSection').scrollIntoView()"); pg.wait_for_timeout(300)
        v = pg.evaluate('window.__v||[]')
        check('no CSP violations while using menu, recitations, qibla (lazy script), azkar, tasbih', v == [], v)
        check('no page errors during the same session', not pg.errs, pg.errs)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: csp runtime', False, str(ex)[:160])

    # ---------------- boot.js: الخط غير الحاجب + علَم فشل adhan بلا inline handlers
    try:
        ctx, pg = page(b)
        r = pg.evaluate("""(async()=>{
          const l=document.createElement('link');l.rel='stylesheet';l.href='css/styles.min.css?x='+Date.now();l.media='print';l.setAttribute('data-async-font','');document.head.appendChild(l);
          await new Promise(r=>setTimeout(r,800));
          const s=document.createElement('script');s.src='vendor/adhan-missing.js';document.head.appendChild(s);
          await new Promise(r=>setTimeout(r,800));
          return {media:l.media,flag:!!window.__adhanLoadFailed}})()""")
        check('boot.js: stylesheet link with data-async-font flips media print to all on load (no inline onload)', r['media'] == 'all', r)
        check('boot.js: failed vendor/adhan* script sets __adhanLoadFailed (no inline onerror)', r['flag'], r)
        check('boot.js: saved manual theme applied before first paint (data-theme=light from storage)', pg.evaluate("document.documentElement.getAttribute('data-theme')") == 'light')
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: boot', False, str(ex)[:160])

    # ---------------- a11y: أزرار تصفية بـ aria-pressed (لا tabs)، تركيز محفوظ، aria-modal يُدار
    try:
        ctx, pg = page(b, touch=True)
        a = pg.evaluate("""(()=>({
          groups:['catPills','rcRiwayatPills'].map(id=>document.getElementById(id).getAttribute('role')),
          roleTabs:document.querySelectorAll('[role=tab],[role=tablist],[aria-selected]').length,
          pressed:[...document.querySelectorAll('#catPills .cat-pill')].map(b=>b.getAttribute('aria-pressed')),
          modalStatic:[document.getElementById('qiblaScreen').hasAttribute('aria-modal'),document.getElementById('fdiv').hasAttribute('aria-modal')]}))()""")
        check('filter pills: role=group (no tablist/tab/aria-selected anywhere), exactly one aria-pressed=true', a['groups'] == ['group', 'group'] and a['roleTabs'] == 0 and a['pressed'].count('true') == 1 and a['pressed'].count('false') == len(a['pressed']) - 1, a)
        check('dialogs have NO static aria-modal while hidden', a['modalStatic'] == [False, False], a['modalStatic'])
        n_before = pg.evaluate("document.querySelectorAll('#catPills .cat-pill').length")
        pg.focus('#catPills .cat-pill:nth-child(3)'); pg.keyboard.press('Space'); pg.wait_for_timeout(250)
        c = pg.evaluate("({same:document.activeElement===document.querySelector('#catPills .cat-pill:nth-child(3)'),pressed:document.activeElement.getAttribute('aria-pressed'),cls:document.activeElement.classList.contains('cat-pill--active'),n:document.querySelectorAll('#catPills .cat-pill').length})")
        check('keyboard: activating a pill keeps focus on the SAME element (no rebuild), state updates', c['same'] and c['pressed'] == 'true' and c['cls'] and c['n'] == n_before, c)
        pg.evaluate("document.querySelector('[data-qibla-open]').click()"); pg.wait_for_timeout(1200)
        m1 = pg.evaluate("document.getElementById('qiblaScreen').getAttribute('aria-modal')")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        m2 = pg.evaluate("document.getElementById('qiblaScreen').hasAttribute('aria-modal')")
        check('DialogA11y sets aria-modal=true on open and removes it on close', m1 == 'true' and m2 is False, (m1, m2))
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: a11y', False, str(ex)[:160])

    # ---------------- theme-color: كل الوسوم تتوحّد على لون الثيم الفعلي
    try:
        ctx, pg = page(b, touch=True)
        pg.evaluate("document.querySelector('.stg-theme-btn[data-mode=dark]').click()"); pg.wait_for_timeout(300)
        d = pg.evaluate("({metas:[...document.querySelectorAll('meta[name=theme-color]')].map(m=>m.content),v:getComputedStyle(document.documentElement).getPropertyValue('--meta-theme-color').trim(),t:document.documentElement.getAttribute('data-theme')})")
        pg.evaluate("document.querySelector('.stg-theme-btn[data-mode=light]').click()"); pg.wait_for_timeout(300)
        l = pg.evaluate("({metas:[...document.querySelectorAll('meta[name=theme-color]')].map(m=>m.content),v:getComputedStyle(document.documentElement).getPropertyValue('--meta-theme-color').trim()})")
        check('theme-color: dark makes all metas = #0e0d0a = --meta-theme-color', d['t'] == 'dark' and set(d['metas']) == {'#0e0d0a'} and d['v'] == '#0e0d0a', d)
        check('theme-color: light makes all metas = #f0f1ee = --meta-theme-color (media metas never contradict a manual choice)', set(l['metas']) == {'#f0f1ee'} and l['v'] == '#f0f1ee', l)
        check('index.html: 3 theme-color metas (dark media, light media, id=themeColorMeta fallback)', len(re.findall(r'<meta name="theme-color"', html)) == 3 and 'id="themeColorMeta"' in html)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: theme-color', False, str(ex)[:160])

    # ---------------- أذكار: النقر عبر تفويض أحداث
    try:
        ctx, pg = page(b, touch=True)
        r = pg.evaluate("""(()=>{const card=[...document.querySelectorAll('#azCard .zi')].find(z=>z.querySelector('.zi-val'));const v=card.querySelector('.zi-val'),b=card.querySelector('.zi-btn');const t0=v.textContent;b.click();return {t0,t1:v.textContent,inlineOnclick:document.querySelectorAll('[onclick]').length}})()""")
        check('azkar: tap works via event delegation (counter advances), zero [onclick] attributes in DOM', r['t0'] != r['t1'] and r['inlineOnclick'] == 0, r)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: azkar', False, str(ex)[:160])

    # ---------------- XSS: مدينة خبيثة من خدمة الموقع لا تُنفَّذ ولا تُحقن كوسوم
    try:
        evil = "<img src=x onerror=window.__xss=1><b id=pwn>x</b>"
        loc = dict(LOC)
        loc['data'] = dict(LOC['data'])
        loc['data']['city'] = evil
        loc['data']['country'] = "<script>window.__xss=2</script>"
        ctx, pg = page(b, touch=True, loc=False, extra="localStorage.setItem('qr_location_v3',%s);" % json.dumps(json.dumps(loc)))
        pg.evaluate("document.getElementById('prayerSection').scrollIntoView()"); pg.wait_for_timeout(1200)
        x = pg.evaluate("({xss:window.__xss||0,city:(document.querySelector('.pt-city')||{}).textContent,imgs:document.querySelectorAll('#prayerSection img,#prayerSection b#pwn').length})")
        check('XSS: malicious city rendered as TEXT only (no img/b injected, no handler ran)', x['xss'] == 0 and x['city'] == evil and x['imgs'] == 0, x)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: xss', False, str(ex)[:160])

    # ---------------- الروابط العميقة لا تشغّل تلقائيًا + زر التشغيل يعمل بعد استعادة/اختيار محطة
    try:
        ctx, pg = page(b, touch=True)
        sid = pg.evaluate("document.querySelectorAll('#stList .st-item')[2].dataset.id")
        name = pg.evaluate("document.querySelectorAll('#stList .st-item')[2].querySelector('.st-name').textContent")
        pg.goto(B + '?s=' + sid)
        pg.wait_for_timeout(1800)
        s = pg.evaluate("({paused:document.getElementById('audioEl').paused,src:document.getElementById('audioEl').getAttribute('src'),title:document.getElementById('npTitle').textContent,active:(document.querySelector('#stList .st-item.active')||{dataset:{}}).dataset.id})")
        check('deep link ?s=<id>: station SELECTED (title + active card) but NOT auto-played (no src loaded)', s['paused'] and s['src'] is None and s['title'] == name and s['active'] == sid, s)
        pg.evaluate("document.getElementById('pbtn').click()"); pg.wait_for_timeout(1500)
        loaded = pg.evaluate("(()=>{const a=document.getElementById('audioEl');return !!a.getAttribute('src')||document.getElementById('npStation').textContent!=='إذاعة مختارة — اضغط للتشغيل'})()")
        check('first press on the play button after a deep link loads that station (no dead click)', loaded)
        ctx.close()
        ctx, pg = page(b, touch=True)
        pg.evaluate("localStorage.setItem('qr_last',document.querySelectorAll('#stList .st-item')[3].dataset.id)"); pg.reload(); pg.wait_for_timeout(1500)
        pg.evaluate("document.getElementById('pbtn').click()"); pg.wait_for_timeout(1500)
        ok2 = pg.evaluate("(()=>{const a=document.getElementById('audioEl');return !!a.getAttribute('src')||document.getElementById('npStation').textContent!=='آخر استماع'})()")
        check('restored last station: the main play button actually starts it (was a dead click before v5.8)', ok2)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: deep link', False, str(ex)[:160])

    # ---------------- appinstalled + MediaSession artwork PNG
    try:
        ctx, pg = page(b, touch=True)
        pg.evaluate("window.dispatchEvent(new Event('appinstalled'))"); pg.wait_for_timeout(200)
        i = pg.evaluate("({txt:document.getElementById('stgInstallBtn').textContent,dis:document.getElementById('stgInstallBtn').disabled})")
        check('appinstalled event updates the settings button immediately (text + disabled)', i['txt'] == 'التطبيق مثبّت بالفعل' and i['dis'] is True, i)
        pg.evaluate("document.querySelector('#stList .st-item .st-hit').click()"); pg.wait_for_timeout(1200)
        art = pg.evaluate("(navigator.mediaSession&&navigator.mediaSession.metadata)?[...navigator.mediaSession.metadata.artwork].map(a=>a.src.split('/').pop()+'|'+a.type):'none'")
        check('MediaSession artwork uses PNG icons (192 + 512), not SVG', art != 'none' and all(a.endswith('image/png') for a in art) and any(a.startswith('icon-512.png') for a in art), art)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: install/artwork', False, str(ex)[:160])

    b.close()

srv.terminate()
for n, ok, d in res:
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else '  -> ' + str(d)[:260]))
print('\nTOTAL %d  PASS %d  FAIL %d' % (len(res), sum(ok for _, ok, _ in res), sum(not ok for _, ok, _ in res)))
raise SystemExit(0 if all(ok for _, ok, _ in res) else 1)
