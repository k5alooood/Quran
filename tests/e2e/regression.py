import os
import subprocess, time, json, re
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = '8790'
srv = subprocess.Popen(['python3', '-m', 'http.server', PORT], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:%s/' % PORT
RIW = {"riwayat": [{"id": 1, "name": "حفص عن عاصم"}, {"id": 2, "name": "ورش عن نافع"}]}
REC = {"reciters": [{"id": i, "name": "القارئ %d" % i, "moshaf": [{"id": i, "name": "x", "server": "https://srv.example/%d/" % i, "surah_list": "1,2,3,4,5", "surah_total": 5, "moshaf_type": 11}]} for i in range(1, 6)]}
results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))


def route(r):
    u = r.request.url
    if 'mp3quran.net/api/v3/riwayat' in u:
        return r.fulfill(json=RIW)
    if 'mp3quran.net/api/v3/reciters' in u:
        return r.fulfill(json=REC)
    return r.continue_() if '127.0.0.1' in u else r.abort()


SCAN = '''()=>{const out={};const rgb=s=>{const m=s&&s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
const hl=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;if(mx===mn)return [0,0,l];const d=mx-mn,s=l>.5?d/(2-mx-mn):d/(mx+mn);let h;if(mx===r)h=((g-b)/d+(g<b?6:0));else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;return [h*60,s,l]};
document.querySelectorAll('body *').forEach(e=>{const c=getComputedStyle(e);if(c.display==='none')return;
for(const k of ['color','backgroundColor','borderTopColor']){const v=rgb(c[k]);if(!v||v.a<.06)continue;const [h,s,l]=hl(v.r,v.g,v.b);if(s>.12&&l>.05&&l<.97&&h>=75&&h<=275)out[k+' '+c[k]+' '+(e.id||e.className).toString().slice(0,24)]=1}});return Object.keys(out)}'''

with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ['light', 'dark']:
        T = theme + ': '
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        ctx.route('**/*', route)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        pg.add_init_script("if(!localStorage.getItem('__s')){localStorage.setItem('__s','1');localStorage.setItem('qr_theme','%s')}" % theme)
        pg.goto(B + 'index.html')
        pg.wait_for_timeout(1500)
        check(T + 'no JS errors on load', not errs, errs[:2])
        check(T + 'theme applied', pg.evaluate("document.documentElement.getAttribute('data-theme')") == theme)
        check(T + 'bottom nav = 5 items (v5.7: tasbih merged into the azkar tab)', pg.evaluate("document.querySelectorAll('#bnav .bnav-item').length") == 5)
        check(T + 'no green/teal/blue colors on screen', not pg.evaluate(SCAN), pg.evaluate(SCAN)[:3])
        # header menu -> favorites / settings
        pg.click('#menuBtn')
        pg.wait_for_timeout(300)
        items = pg.evaluate("[...document.querySelectorAll('#appMenu .app-menu-item')].map(e=>e.textContent.trim().replace(/\\s+/g,' '))")
        check(T + 'menu has favorites+settings', any('المفضلة' in i for i in items) and any('الإعدادات' in i for i in items), items)
        pg.click('#appMenu a[href="#settingsCard"]')
        pg.wait_for_timeout(1000)
        check(T + 'settings link scrolls + closes menu', pg.evaluate('scrollY') > 400 and pg.evaluate("document.getElementById('appMenu').getAttribute('aria-hidden')") != 'false', pg.evaluate('scrollY'))
        # stations: rapid switching keeps 1 active card, <=2 audio elements
        pg.evaluate('window.scrollTo(0,0)')
        if pg.locator('#stMore').is_visible():  # v5.6: على الجوال تظهر أول ٥ إذاعات فقط حتى «عرض الكل»
            pg.click('#stMore')
            pg.wait_for_timeout(200)
        cards = pg.locator('#stList .st-item')
        n = cards.count()
        for _ in range(3):
            for i in range(min(n, 8)):
                cards.nth(i).dispatch_event('click')  # اختيار إذاعة يطلق scrollIntoView سلسًا؛ النقر الفعلي أثناء الحركة يسبب سباقًا في Playwright (لا في التطبيق)
                pg.wait_for_timeout(30)
        pg.wait_for_timeout(500)
        check(T + 'rapid station switching stable', pg.evaluate("document.querySelectorAll('#stList .st-item.active').length") <= 1 and pg.evaluate("document.querySelectorAll('audio').length") <= 2)
        # failed stream shows a readable Arabic status + no crash
        status = pg.evaluate("(document.querySelector('.np-slab')||{}).textContent")
        check(T + 'stream failure shows status text', bool(status and status.strip()), status)
        # favorites add/remove
        cards.first.locator('.st-fav').click()
        pg.wait_for_timeout(200)
        check(T + 'favorite added', pg.evaluate("document.querySelectorAll('#favList .st-item').length") == 1)
        pg.locator('#favList .st-fav').first.click()
        pg.wait_for_timeout(200)
        check(T + 'favorite removed', pg.evaluate("localStorage.getItem('qr_favs')") == '[]')
        # tasbih
        pg.locator('#tbRing').scroll_into_view_if_needed()
        before = pg.evaluate("document.getElementById('tbNum').textContent")
        pg.click('#tbRing')
        pg.wait_for_timeout(200)
        check(T + 'tasbih increments', pg.evaluate("document.getElementById('tbNum').textContent") != before)
        # recitations
        pg.locator('#reciteCard').scroll_into_view_if_needed()
        pg.wait_for_timeout(900)
        check(T + 'riwayat pills render', pg.evaluate("document.querySelectorAll('#rcRiwayatPills .cat-pill').length") == 2)
        check(T + 'selected riwayat uses ✓ style', pg.evaluate("getComputedStyle(document.querySelector('#rcRiwayatPills .cat-pill--active'),'::before').content") not in ('none', 'normal'))
        check(T + 'reciters list renders', pg.evaluate("document.querySelectorAll('#reciteCard .st-item').length") >= 5)
        # play button visible (icon color != background)
        pc = pg.evaluate("(()=>{const b=document.getElementById('pbtn');const c=getComputedStyle(b);return [c.color,c.backgroundImage.slice(0,40)]})()")
        check(T + 'play button gold gradient + readable icon', 'gradient' in pc[1] and pc[0] in ('rgb(255, 250, 240)', 'rgb(26, 20, 5)'), pc)
        # no pulsing animations on live indicators
        anim = pg.evaluate("[...document.querySelectorAll('.hero-live i,.ldot,.pt-next-dot')].map(e=>getComputedStyle(e).animationName)")
        check(T + 'no blinking live dots', all(a == 'none' for a in anim), anim)
        # install banner: close button doesn't overlap icon
        pg.evaluate('window.scrollTo(0,0)')
        pg.evaluate("window.QuranPWAInstall.showManual()")
        pg.wait_for_timeout(500)
        geo = pg.evaluate("(()=>{const a=document.querySelector('.pwa-install-icon').getBoundingClientRect(),c=document.querySelector('.pwa-install-close').getBoundingClientRect();return !(c.right>a.left&&c.left<a.right&&c.bottom>a.top&&c.top<a.bottom)})()")
        check(T + 'install banner close does not overlap icon', geo)
        check(T + 'install banner close target >=44px', pg.evaluate("(()=>{const r=document.querySelector('.pwa-install-close').getBoundingClientRect();return r.width>=44&&r.height>=44})()"))
        # (dismissal persistence is covered by install_banner.py — a real 15s-timer test with a positive control)
        check(T + 'no JS errors after interactions', not errs, errs[:2])
        ctx.close()

    # responsive overflow
    for w in [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440]:
        ctx = b.new_context(viewport={'width': w, 'height': 800})
        ctx.route('**/*', route)
        pg = ctx.new_page()
        pg.goto(B + 'index.html')
        pg.wait_for_timeout(700)
        ov = pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
        check('overflow @%d' % w, ov <= 0, ov)
        ctx.close()

    # poisoned storage
    ctx = b.new_context()
    ctx.route('**/*', route)
    pg = ctx.new_page()
    e2 = []
    pg.on('pageerror', lambda e: e2.append(str(e)))
    pg.add_init_script("localStorage.setItem('qr_theme','zzz');localStorage.setItem('qr_favs','{bad');localStorage.setItem('qr_tb','abc');localStorage.setItem('qr_tgt','-5');localStorage.setItem('qr_vol','NaN');localStorage.setItem('qr_recite_state','[[[')")
    pg.goto(B + 'index.html')
    pg.wait_for_timeout(1500)
    check('corrupted localStorage does not crash', not e2, e2)
    ctx.close()

    # manifest/icons/precache + real offline
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.route('**/*', route)
    pg = ctx.new_page()
    man = json.loads(pg.request.get(B + 'manifest.json').text())
    srcs = [i['src'] for i in man['icons']] + [i['src'] for s in man['shortcuts'] for i in s['icons']]
    check('manifest icons all resolve', all(pg.request.get(B + s).status == 200 for s in srcs), srcs)
    check('manifest has separate maskable icons', any(i['purpose'] == 'maskable' and 'maskable' in i['src'] for i in man['icons']))
    sw = pg.request.get(B + 'sw.js').text()
    pre = re.findall(r"'\./([^']+)'", sw)
    check('SW precache entries all exist', all(pg.request.get(B + f).status == 200 for f in pre), len(pre))
    pg.goto(B + 'index.html')
    pg.wait_for_timeout(2500)
    pg.reload()
    pg.wait_for_timeout(1500)
    check('SW controls page', pg.evaluate('!!navigator.serviceWorker.controller'))
    srv.terminate()
    srv.wait()
    time.sleep(0.5)
    ok = True
    for path in ['index.html', '', '?source=pwa']:
        try:
            pg.goto(B + path, timeout=15000)
            pg.wait_for_timeout(700)
            ok = ok and 'القرآن الكريم مباشر' in (pg.evaluate("(document.querySelector('h1')||{}).textContent") or '')
        except Exception:
            ok = False
    check('offline: app opens from cache (3 URLs)', ok)
    pg.goto(B + 'never-cached.html')
    pg.wait_for_timeout(600)
    check('offline: uncached page shows Arabic fallback', 'لا يوجد اتصال' in pg.evaluate('document.body.innerText'))
    b.close()

fails = [r for r in results if not r[1]]
for name, ok, d in results:
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or d == '' else '  -> ' + str(d)[:140]))
print('\nTOTAL %d  PASS %d  FAIL %d' % (len(results), len(results) - len(fails), len(fails)))
