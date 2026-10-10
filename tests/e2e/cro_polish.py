"""اختبارات v5.5.0 (تدقيق التصميم/التحويل): هرمية الأحجام، النداء الثانوي وسطر الثقة، بطاقة الصلاة القادمة،
أهداف اللمس 44px (محاكاة لمس)، حدّ النصوص، حالة «آخر استماع»، ترتيب القائمة، وحدة 360×740.
تشغيل:  python3 tests/e2e/cro_polish.py   — Chromium + API مُحاكى."""
import json, os, re, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8898'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8898/index.html'
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

    # ---- 1) hierarchy: header < np title < H1
    try:
        ctx, pg = page(b)
        fs = pg.evaluate("[parseFloat(getComputedStyle(document.querySelector('.hdr span, .hdr .title, .hdr h1, .hdr')).fontSize),parseFloat(getComputedStyle(document.getElementById('npTitle')).fontSize),parseFloat(getComputedStyle(document.querySelector('.hero-copy h1')).fontSize),getComputedStyle(document.getElementById('npTitle')).fontWeight]")
        check('hierarchy: player title (%spx) is smaller than the H1 (%spx)' % (fs[1], fs[2]), fs[1] < fs[2] and fs[1] >= 18, fs)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: hierarchy', False, str(ex)[:120])

    # ---- 2) hero CTA: secondary is a text link, trust line present, primary stays the dominant button
    for w, h in [(390, 844), (360, 740), (320, 640)]:
        try:
            ctx, pg = page(b, w, h)
            m = pg.evaluate("""()=>{const q=s=>document.querySelector(s);const p=q('.hero-primary').getBoundingClientRect(),s=q('.hero-secondary').getBoundingClientRect(),cs=getComputedStyle(q('.hero-secondary'));
              return {pw:Math.round(p.width),ph:Math.round(p.height),sw:Math.round(s.width),sh:Math.round(s.height),sameRow:Math.abs(p.top+p.height/2-(s.top+s.height/2))<8,bg:cs.backgroundColor,border:cs.borderTopWidth,deco:cs.textDecorationLine,trust:(q('.hero-trust')||{textContent:''}).textContent.trim(),ov:document.documentElement.scrollWidth-document.documentElement.clientWidth,hero:Math.round(q('.home-hero').getBoundingClientRect().height)}}""")
            layout_ok = (m['sameRow'] and m['pw'] >= 150) if w >= 360 else (not m['sameRow'] and m['pw'] >= w - 80)
            check('hero %dpx: secondary is an underlined text link (%s) and the primary stays a full-size button (%dpx)' % (w, 'same row' if w >= 360 else 'stacked below', m['pw']), m['deco'] == 'underline' and m['border'] == '0px' and layout_ok and m['sh'] >= 44 and m['ph'] >= 48, m)
            check('hero %dpx: trust line removed in v5.7.1 and no overflow' % w, m['trust'] == '' and m['ov'] <= 0, m)
            if w == 390:
                mm = pg.evaluate("(()=>{const n=document.getElementById('npCard').getBoundingClientRect(),nav=document.getElementById('bnav').getBoundingClientRect().top;return {hero:Math.round(document.querySelector('.home-hero').getBoundingClientRect().height),vis:Math.round(Math.max(0,Math.min(n.bottom,nav)-n.top)/n.height*100)}})()")
                check('hero 390x844: height <=360px (was 348 before the trust line) and player card still >=55%% visible -> %s' % mm, mm['hero'] <= 360 and mm['vis'] >= 55, mm)
            if w == 360:
                np_vis = pg.evaluate("(()=>{const n=document.getElementById('npCard').getBoundingClientRect(),nav=document.getElementById('bnav').getBoundingClientRect().top;return Math.round(Math.max(0,Math.min(n.bottom,nav)-n.top)/n.height*100)})()")
                check('hero 360x740: more of the player card is visible than before (was 18%%) -> %d%%' % np_vis, np_vis >= 20, np_vis)
            ctx.close()
        except Exception as ex:
            check('SECTION CRASHED: hero %d' % w, False, str(ex)[:120])

    # ---- 3) next-prayer chip
    try:
        ctx, pg = page(b)
        c = pg.evaluate("""()=>{const q=s=>document.querySelector(s);const chip=q('#homeNextPrayer');const strip=q('.cal-card');const r=chip.getBoundingClientRect();
          return {hidden:chip.hidden,h:Math.round(r.height),stripShown:getComputedStyle(strip).display!=='none',name:q('#homeNextName').textContent,count:q('#homeNextCount').textContent,date:q('#homeNextDate').textContent,aria:chip.getAttribute('aria-label'),label:q('#homeNextLabel').textContent,tag:chip.tagName,href:chip.getAttribute('href')}}""")
        check('next prayer chip: visible, replaces the date strip, 64px tall', not c['hidden'] and not c['stripShown'] and 62 <= c['h'] <= 70, c)
        check('next prayer chip: Arabic-Indic worded countdown (س/د/ث, no dot-zeros), prayer name, date caption incl. Hijri', re.fullmatch(r'[\u0660-\u0669]+ (س|د|ث)( [\u0660-\u0669]+ (د|ث))?', c['count']) and c['name'] in ('الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء') and '·' in c['date'] and re.search(r'[\u0660-\u0669]{4}', c['date']), c)
        check('next prayer chip: accessible name + real link to the prayer section', c['aria'].startswith('الصلاة القادمة') and c['tag'] == 'A' and c['href'] == '#prayerSection', c)
        pg.wait_for_timeout(2200)
        c2 = pg.evaluate("document.getElementById('homeNextCount').textContent")
        # v5.6: فوق الساعة يُعرض «س د» بلا ثوانٍ (لا تغيّر كل ثانية بالتصميم)؛ دون الساعة يجب أن تتغير الثواني
        check('next prayer chip: countdown ticks every second (under 1h) / hours+minutes only (over 1h)', ('س' in c['count']) or c2 != c['count'], (c['count'], c2))
        y0 = pg.evaluate('scrollY')
        pg.click('#homeNextPrayer')
        pg.wait_for_timeout(1500)
        top = pg.evaluate("document.getElementById('prayerSection').getBoundingClientRect().top")
        check('next prayer chip: tap scrolls to the prayer section', pg.evaluate('scrollY') > y0 + 500 and -50 < top < 400, (pg.evaluate('scrollY'), top))
        check('next prayer chip: no JS errors', not pg.errs, pg.errs)
        ctx.close()
        # fallback location (no cached location, providers blocked) -> labelled Makkah, never silently wrong
        ctx, pg = page(b, loc=False)
        lab = pg.evaluate("[document.getElementById('homeNextPrayer').hidden,document.getElementById('homeNextLabel').textContent]")
        check('next prayer chip: fallback location is labelled "مكة المكرمة"', (not lab[0]) and 'مكة' in lab[1], lab)
        ctx.close()
        # prayer calculation unavailable (Adhan library blocked) -> chip hidden, date strip stays
        ctx, pg = page(b, block_adhan=True)
        st = pg.evaluate("[document.getElementById('homeNextPrayer').hidden,getComputedStyle(document.querySelector('.cal-card')).display!=='none']")
        check('next prayer chip: hidden and date strip kept when prayers cannot be computed', st[0] and st[1], st)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: chip', False, str(ex)[:120])

    # ---- 4) touch targets (touch emulation => pointer:coarse)
    try:
        ctx, pg = page(b, touch=True)
        pg.locator('#stList .st-fav').first.scroll_into_view_if_needed()
        t = pg.evaluate("""()=>{const sz=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]};
          return {fav:sz('#stList .st-fav'),mute:sz('#mutebtn'),menu:sz('#menuBtn'),pill:sz('#stationsCard .cat-pill'),tb:sz('#tbTargetBtn'),secondary:sz('.hero-secondary'),primary:sz('.hero-primary')}}""")
        ok = all(v and v[0] >= 44 and v[1] >= 44 for k, v in t.items() if k != 'tb') and t['tb'] and t['tb'][1] >= 44
        check('touch targets >=44px with touch emulation (fav, mute, menu, filter pills, goal badge, CTAs)', ok, t)
        ov = pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
        cardh = pg.evaluate("Math.round(document.querySelector('#stList .st-item').getBoundingClientRect().height)")
        check('touch targets: no horizontal overflow, station card not distorted (<=130px)', ov <= 0 and cardh <= 130, (ov, cardh))
        ctx.close()
        ctx, pg = page(b)  # mouse: unchanged sizes (rule is coarse-only)
        fav = pg.evaluate("(()=>{const r=document.querySelector('#stList .st-fav').getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})()")
        check('mouse pointer: station star keeps its compact size (rule is touch-only)', fav[0] < 44, fav)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: touch', False, str(ex)[:120])

    # ---- 5) text size floor + bottom nav labels
    try:
        for w in (390, 320):
            ctx, pg = page(b, w, 800)
            r = pg.evaluate("""()=>{const px=s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null};
              const nav=[...document.querySelectorAll('#bnav .bnav-item')].map(e=>{const sp=e.querySelector('span')||e;const r=sp.getBoundingClientRect(),p=e.getBoundingClientRect();return {t:e.textContent.trim(),fs:parseFloat(getComputedStyle(e).fontSize),h:Math.round(p.height),fits:sp.scrollWidth<=p.width+1&&r.height<20}});
              return {cal:px('.cal-label'),np:px('.np-sub'),st:px('.strow'),badge:px('.st-badge'),nav,ov:document.documentElement.scrollWidth-document.documentElement.clientWidth}}""")
            floor = 12 if w >= 360 else 12
            check('type floor @%d: labels >=12px (cal-label %s, np-sub %s, status %s, badge %s)' % (w, r['cal'], r['np'], r['st'], r['badge']), all(v >= 11.9 for v in (r['cal'], r['np'], r['st'], r['badge'])), r)
            check('bottom nav @%d: labels %spx, one line, fit inside their items, no overflow' % (w, r['nav'][0]['fs']), all(n['fits'] for n in r['nav']) and r['nav'][0]['fs'] >= (10 if w < 340 else 11) and r['ov'] <= 0, r['nav'])
            ctx.close()
        for w in (390, 320):
            ctx, pg = page(b, w, 800, touch=True)
            pg.get_by_text('أذكار الصباح').first.click()
            pg.wait_for_timeout(500)
            small = pg.evaluate("[...document.querySelectorAll('body *')].filter(e=>{const c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1)&&e.getBoundingClientRect().width>0&&parseFloat(c.fontSize)<11.95&&!e.closest('#bnav')}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,22)+'@'+parseFloat(getComputedStyle(e).fontSize).toFixed(1))")
            check('type floor @%d: no visible text under 12px anywhere (home, prayer, azkar opened, settings) except bottom-nav labels' % w, not small, small[:6])
            ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: type floor', False, str(ex)[:120])

    # ---- 6) resume state
    try:
        ctx, pg = page(b)
        ids = pg.evaluate("document.querySelectorAll('#stList .st-item')[3].getAttribute('data-id')")
        name = pg.evaluate("document.querySelectorAll('#stList .st-item')[3].querySelector('.st-name').textContent")
        ctx.close()
        ctx, pg = page(b, extra="localStorage.setItem('qr_last','%s');" % ids)
        v = pg.evaluate("[document.getElementById('npStation').textContent,document.getElementById('npTitle').textContent,!!(document.querySelector('audio')&&document.querySelector('audio').getAttribute('src'))]")
        check('resume: badge says «آخر استماع», title is the last station, no audio loaded yet', v[0] == 'آخر استماع' and v[1] == name and not v[2], v)
        pg.click('.hero-primary')
        pg.wait_for_timeout(900)
        v2 = pg.evaluate("[document.getElementById('npStation').textContent,document.getElementById('npTitle').textContent]")
        check('resume: after pressing «استمع الآن» the badge shows the station and playback targets it', v2[1] == name and v2[0] == name, v2)
        ctx.close()
        ctx, pg = page(b)
        v3 = pg.evaluate("[document.getElementById('npStation').textContent,document.getElementById('npTitle').textContent]")
        check('first visit (no history): default badge/title unchanged', v3[0] == 'اختر إذاعة', v3)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: resume', False, str(ex)[:120])

    # ---- 7) nav order = page order
    try:
        ctx, pg = page(b)
        order = pg.evaluate("[...document.querySelectorAll('#bnav .bnav-item')].map(e=>e.getAttribute('data-target'))")
        tops = pg.evaluate("t=>t.map(x=>{const e=document.getElementById(x);return e?Math.round(e.getBoundingClientRect().top+scrollY):null})", [o for o in order if o and o != 'homeHero'])
        check('nav order follows the order of the sections on the page', tops == sorted(tops) and None not in tops, (order, tops))
        dn = pg.evaluate("[...document.querySelectorAll('.dnav .bnav-item')].map(e=>e.getAttribute('data-target'))")
        check('desktop sidebar uses the same section order', [d for d in dn if d in ('tbCard', 'azCard')] == [d for d in order if d in ('tbCard', 'azCard')], dn)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: nav order', False, str(ex)[:120])

    # ---- 8) dark theme + desktop sanity for the new chip
    try:
        ctx, pg = page(b, theme='dark')
        cc = pg.evaluate("(()=>{const c=getComputedStyle(document.getElementById('homeNextCount')).color;return c})()")
        check('dark theme: chip countdown uses the gold accent', cc in ('rgb(212, 175, 55)',), cc)
        ctx.close()
        ctx, pg = page(b, 1280, 900)
        d = pg.evaluate("(()=>{const r=document.getElementById('homeNextPrayer').getBoundingClientRect(),n=document.getElementById('npCard').getBoundingClientRect();return {w:Math.round(r.width),sameWidthAsPlayer:Math.abs(r.width-n.width)<3,hidden:document.getElementById('homeNextPrayer').hidden}})()")
        check('desktop 1280: chip aligns with the player card width', not d['hidden'] and d['sameWidthAsPlayer'], d)
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: dark/desktop', False, str(ex)[:120])
    b.close()
srv.terminate()
for n, ok, d in res:
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else '  -> ' + str(d)[:260]))
print('\nTOTAL %d  PASS %d  FAIL %d' % (len(res), sum(ok for _, ok, _ in res), sum(not ok for _, ok, _ in res)))
raise SystemExit(0 if all(ok for _, ok, _ in res) else 1)
