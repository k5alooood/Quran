"""اختبارات v5.7.0: هيرو مضغوط، ٥ تبويبات (الصلاة ثم أذكار)، مجموعة الأذكار والسبحة، ورقة القائمة السفلية، شريط «آخر تلاوة»، صفحة الأوفلاين.
تشغيل:  python3 tests/e2e/v57_ui.py"""
import json, os, re, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8899'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8899/index.html'
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



with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- phone 390x844: first fold, structure, nav, menu sheet
    try:
        ctx, pg = page(b, touch=True)
        m = pg.evaluate("""(()=>{const R=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {y:Math.round(r.y+scrollY),h:Math.round(r.height),b:Math.round(r.bottom+scrollY)}};
          const idx=id=>[...document.querySelectorAll('.dgrid > *')].map(e=>e.id).indexOf(id);
          return {hero:R('.home-hero'),np:R('#npCard'),nav:R('#bnav'),play:R('#npCard #pbtn'),
            h1:[...document.querySelectorAll('h1')].map(e=>e.textContent.trim()),
            labels:[...document.querySelectorAll('#bnav .bnav-item span')].map(e=>e.textContent.trim()),
            bnavTargets:[...document.querySelectorAll('#bnav .bnav-item')].map(e=>e.dataset.target),
            dnavTargets:[...document.querySelectorAll('#dnav .bnav-item')].map(e=>e.dataset.target),
            prayerIdx:idx('prayerSection'),worshipIdx:idx('worshipSection'),
            wrapKids:[...document.getElementById('worshipSection').children].map(e=>e.id),
            kicker:!!document.querySelector('.hero-kicker')}})()""")
        check('hero is compact (<= 240px; was 354px in 5.6.1)', m['hero']['h'] <= 240, m['hero'])
        check('player card incl. play button fully above the bottom nav on first screen', m['np']['b'] <= m['nav']['y'] - 8 and m['play'] and m['play']['b'] <= m['nav']['y'], (m['np'], m['nav'], m['play']))
        check('single H1 and SEO baseline text preserved', m['h1'] == ['القرآن الكريم مباشر — بث حي للقرآن الكريم'], m['h1'])
        check('bottom nav has exactly 5 tabs in order: home, stations, recitations, prayer, azkar', m['labels'] == ['الرئيسية', 'الإذاعات', 'التلاوات', 'الصلاة', 'أذكار'], m['labels'])
        check('no separate tasbih/azkar tabs; worshipSection is the azkar tab target', 'tbCard' not in m['bnavTargets'] and 'azCard' not in m['bnavTargets'] and m['bnavTargets'][-1] == 'worshipSection', m['bnavTargets'])
        check('desktop sidebar order matches: prayer then worship', m['dnavTargets'].index('prayerSection') < m['dnavTargets'].index('worshipSection') and 'tbCard' not in m['dnavTargets'], m['dnavTargets'])
        check('page order: prayer section before worship stack', 0 <= m['prayerIdx'] < m['worshipIdx'], (m['prayerIdx'], m['worshipIdx']))
        check('worship stack holds tasbih then azkar', m['wrapKids'] == ['tbCard', 'azCard'], m['wrapKids'])
        check('marketing kicker/lead removed from hero (H1 kept)', not m['kicker'])
        # nav click -> scroll + active
        pg.click('#bnav [data-target=worshipSection]'); pg.wait_for_timeout(1500)
        d = pg.evaluate("({top:Math.round(document.getElementById('worshipSection').getBoundingClientRect().top),act:[...document.querySelectorAll('#bnav .bnav-item.active span')].map(e=>e.textContent)})")
        check('tapping «أذكار» scrolls to the worship stack and highlights the tab', abs(d['top']) <= 4 and d['act'] == ['أذكار'], d)
        pg.evaluate("document.getElementById('azCard').scrollIntoView({block:'center'})"); pg.wait_for_timeout(900)
        act = pg.evaluate("[...document.querySelectorAll('#bnav .bnav-item.active span')].map(e=>e.textContent)")
        check('scrolling to the azkar card keeps «أذكار» highlighted', act == ['أذكار'], act)
        # menu bottom sheet
        pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(500)
        pg.click('#menuBtn'); pg.wait_for_timeout(500)
        s = pg.evaluate("(()=>{const m=document.getElementById('appMenu').getBoundingClientRect(),n=document.getElementById('bnav').getBoundingClientRect(),bd=document.getElementById('menuBackdrop');return {pos:getComputedStyle(document.getElementById('appMenu')).position,bottom:Math.round(m.bottom),navTop:Math.round(n.top),bdOpen:bd.classList.contains('open')&&!bd.hidden,minH:Math.min(...[...document.querySelectorAll('#appMenu .app-menu-item')].map(e=>e.getBoundingClientRect().height))}})()")
        check('menu opens as a bottom sheet above the nav with a backdrop', s['pos'] == 'fixed' and s['bottom'] <= s['navTop'] and s['bdOpen'], s)
        check('menu items are >=48px tall', s['minH'] >= 48, s)
        pg.mouse.click(190, 60); pg.wait_for_timeout(400)
        check('tapping the backdrop closes the menu', pg.evaluate("!document.getElementById('appMenu').classList.contains('open')&&document.getElementById('menuBackdrop').hidden"))
        pg.click('#menuBtn'); pg.wait_for_timeout(300); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        check('Escape closes the menu and hides the backdrop', pg.evaluate("!document.getElementById('appMenu').classList.contains('open')&&document.getElementById('menuBackdrop').hidden"))
        check('no page errors', not pg.errs, pg.errs)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: phone', False, str(ex)[:160])

    # ---- resume-last-recitation bar
    try:
        ctx, pg = page(b, touch=True)
        check('resume bar hidden when nothing saved', pg.evaluate("document.getElementById('rcResume').hidden"))
        ctx.close()
        ctx, pg = page(b, touch=True, extra="localStorage.setItem('qr_recite_state',JSON.stringify({riwayahId:'1',reciterId:'1',surahNum:36,time:5,repeatMode:'off',reciterName:'مشاري العفاسي'}));")
        r = pg.evaluate("(()=>{const b=document.getElementById('rcResume');return {hidden:b.hidden,sub:document.getElementById('rcResumeSub').textContent,h:Math.round(b.getBoundingClientRect().height),aria:b.getAttribute('aria-label')}})()")
        check('resume bar shows saved surah + reciter and is >=44px tall', (not r['hidden']) and 'مشاري العفاسي' in r['sub'] and r['h'] >= 44, r)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: resume', False, str(ex)[:160])

    # ---- offline.html follows the app theme logic + 48px retry button
    try:
        for mode, scheme, theme, want in [('manual', 'dark', 'light', 'light'), ('manual', 'light', 'dark', 'dark'), ('system', 'light', '', 'light'), ('system', 'dark', '', 'dark')]:
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, color_scheme=scheme)
            ctx.route('**/*', route())
            pg = ctx.new_page()
            pg.add_init_script("localStorage.setItem('qr_theme_mode','%s');%s" % (mode, ("localStorage.setItem('qr_theme','%s');" % theme) if theme else ''))
            pg.goto(B.replace('index.html', 'offline.html')); pg.wait_for_timeout(300)
            got = pg.evaluate("document.documentElement.getAttribute('data-theme')")
            check('offline.html theme: mode=%s scheme=%s saved=%s -> %s' % (mode, scheme, theme or '-', want), got == want, got)
            ctx.close()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}); ctx.route('**/*', route()); pg = ctx.new_page()
        pg.goto(B.replace('index.html', 'offline.html')); pg.wait_for_timeout(300)
        o = pg.evaluate("(()=>{const a=document.querySelector('a');return {h:Math.round(a.getBoundingClientRect().height),href:a.getAttribute('href')}})()")
        check('offline retry link is a real link (./) and >=48px', o['href'] == './' and o['h'] >= 48, o)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: offline', False, str(ex)[:160])

    # ---- desktop 1280: worship stack keeps the reading width, no overflow
    try:
        ctx, pg = page(b, 1280, 900)
        d = pg.evaluate("(()=>{const w=document.getElementById('worshipSection').getBoundingClientRect(),t=document.getElementById('tbCard').getBoundingClientRect(),a=document.getElementById('azCard').getBoundingClientRect();return {w:Math.round(w.width),tb:Math.round(t.width),az:Math.round(a.width),overflowX:document.documentElement.scrollWidth>innerWidth+1,menuPos:getComputedStyle(document.getElementById('appMenu')).position}})()")
        check('desktop 1280: worship stack capped (<=900px), cards fill it, no horizontal overflow', d['w'] <= 900 and abs(d['tb'] - d['w']) <= 2 and abs(d['az'] - d['w']) <= 2 and not d['overflowX'], d)
        check('desktop 1280: menu stays a dropdown (not a bottom sheet)', d['menuPos'] == 'absolute', d)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: desktop', False, str(ex)[:160])
    b.close()
srv.terminate()
for n, ok, d in res:
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else '  -> ' + str(d)[:260]))
print('\nTOTAL %d  PASS %d  FAIL %d' % (len(res), sum(ok for _, ok, _ in res), sum(not ok for _, ok, _ in res)))
raise SystemExit(0 if all(ok for _, ok, _ in res) else 1)
