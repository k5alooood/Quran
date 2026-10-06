"""اختبارات التغييرات المعتمدة (5.4.0): الحوارات، دلالات البطاقات، زر «استمع الآن»،
سياسة الأرقام (عربية هندية)، التابلت، aria-valuetext، الحالات الفارغة.
تشغيل:  python3 tests/e2e/phase_ab.py   — كل شيء Chromium + API مُحاكى."""
import json, os, re, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8870'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8870/index.html'
RIW = {"riwayat": [{"id": 1, "name": "حفص عن عاصم"}]}
NAMES = ["مشاري العفاسي", "ماهر المعيقلي", "سعد الغامدي", "ياسر الدوسري", "محمود الحصري", "عبد الباسط"]
REC = {"reciters": [{"id": i, "name": NAMES[i - 1], "moshaf": [{"id": i, "name": "x", "server": "https://srv.example/%d/" % i, "surah_list": "1,2,3,4,5", "surah_total": 5, "moshaf_type": 11}]} for i in range(1, 7)]}
LOC = {"ts": int(time.time() * 1000), "data": {"lat": 21.3891, "lon": 39.8579, "city": "مكة المكرمة", "country": "المملكة العربية السعودية", "countryCode": "SA", "timezone": "Asia/Riyadh", "src": "ip"}}
res = []


def check(name, ok, detail=''):
    res.append((name, bool(ok), detail))


def route(r):
    u = r.request.url
    if 'mp3quran.net/api/v3/riwayat' in u:
        return r.fulfill(json=RIW)
    if 'mp3quran.net/api/v3/reciters' in u:
        return r.fulfill(json=REC)
    return r.continue_() if '127.0.0.1' in u else r.abort()


def page(b, w=390, h=844, theme='light', extra=''):
    ctx = b.new_context(viewport={'width': w, 'height': h})
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.set_default_timeout(4000)
    pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)[:100]))
    pg.add_init_script("if(!sessionStorage.getItem('_s')){sessionStorage.setItem('_s','1');localStorage.setItem('qr_theme','%s');localStorage.setItem('quran-pwa-install-dismissed-v24',String(Date.now()));localStorage.setItem('qr_location_v3',%s);%s}" % (theme, json.dumps(json.dumps(LOC)), extra))
    pg.goto(B)
    pg.wait_for_timeout(2000)
    return ctx, pg


LATIN = r'''()=>{const bad=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=w.nextNode()){const t=n.textContent;if(!/[0-9]/.test(t))continue;const e=n.parentElement;if(!e)continue;const c=getComputedStyle(e);
if(c.display==='none'||c.visibility==='hidden'||e.closest('[hidden],.hidden,script,style,noscript,[aria-hidden="true"] .qibla-hidden'))continue;
const r=e.getBoundingClientRect();if(r.width===0&&r.height===0)continue;
const s=t.trim();if(/^[A-Za-z0-9._:\/@-]+$/.test(s))continue;bad.push((e.id||e.className||e.tagName).toString().slice(0,28)+' → '+s.slice(0,40));}
return bad}'''

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- dialogs: focus mode ----------
    try:
        ctx, pg = page(b)
        pg.click('#menuBtn')
        pg.wait_for_timeout(250)
        pg.click('#focusbtn')
        pg.wait_for_timeout(500)
        inside = pg.evaluate("(()=>{const d=document.getElementById('fdiv');return !!d&&d.contains(document.activeElement)})()")
        check('focus mode: focus moves inside on open', inside)
        stays = []
        for _ in range(8):
            pg.keyboard.press('Tab')
            stays.append(pg.evaluate("document.getElementById('fdiv').contains(document.activeElement)"))
        check('focus mode: Tab x8 never leaves the dialog', all(stays), stays)
        back = []
        for _ in range(4):
            pg.keyboard.press('Shift+Tab')
            back.append(pg.evaluate("document.getElementById('fdiv').contains(document.activeElement)"))
        check('focus mode: Shift+Tab x4 never leaves the dialog', all(back), back)
        pg.keyboard.press('Escape')
        pg.wait_for_timeout(500)
        check('focus mode: Esc closes', pg.evaluate("document.getElementById('fdiv').classList.contains('hidden')"))
        check('focus mode: focus returns to the menu button (opener is hidden)', pg.evaluate("document.activeElement&&document.activeElement.id")=='menuBtn', pg.evaluate("document.activeElement&&(document.activeElement.id||document.activeElement.className)"))
        check('focus mode: no JS errors', not pg.errs, pg.errs)
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: dialogs: focus mode', False, str(ex)[:120])
    # ---------- dialogs: qibla ----------
    try:
        ctx, pg = page(b)
        pg.evaluate("(()=>{const b=[...document.querySelectorAll('[data-qibla-open]')].find(e=>e.getClientRects().length);b.focus();b.click()})()")
        pg.wait_for_timeout(1800)
        check('qibla: focus moves inside on open', pg.evaluate("(()=>{const d=document.getElementById('qiblaScreen');return !!d&&!d.classList.contains('hidden')&&d.contains(document.activeElement)})()"))
        stays = []
        for _ in range(10):
            pg.keyboard.press('Tab')
            stays.append(pg.evaluate("document.getElementById('qiblaScreen').contains(document.activeElement)"))
        check('qibla: Tab x10 never leaves the dialog', all(stays), stays)
        pg.keyboard.press('Escape')
        pg.wait_for_timeout(500)
        check('qibla: Esc closes', pg.evaluate("document.getElementById('qiblaScreen').classList.contains('hidden')"))
        check('qibla: focus returns to the visible opener', pg.evaluate("document.activeElement&&document.activeElement.hasAttribute('data-qibla-open')&&document.activeElement.getClientRects().length>0"), pg.evaluate("document.activeElement&&(document.activeElement.id||document.activeElement.className)"))
        check('qibla: no JS errors', not pg.errs, pg.errs)
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: dialogs: qibla', False, str(ex)[:120])
    # ---------- station cards: real buttons ----------
    try:
        ctx, pg = page(b)
        check('station cards: no div with tabindex/role=listitem left focusable', pg.evaluate("document.querySelectorAll('#stList .st-item[tabindex]').length") == 0)
        n_cards = pg.evaluate("document.querySelectorAll('#stList .st-item').length")
        check('station cards: one .st-hit button per card, with an accessible name', pg.evaluate("[...document.querySelectorAll('#stList .st-item')].every(c=>{const h=c.querySelector('button.st-hit');return h&&h.getAttribute('aria-label')&&h.getAttribute('aria-label').startsWith('تشغيل ')})") and n_cards >= 19, n_cards)
        pg.locator('#stList .st-hit').nth(2).focus()
        pg.keyboard.press('Enter')
        pg.wait_for_timeout(400)
        active = pg.evaluate("[...document.querySelectorAll('#stList .st-item.active')].length")
        cur = pg.evaluate("[...document.querySelectorAll('#stList .st-hit[aria-current=true]')].length")
        check('station cards: Enter on the button selects exactly one card', active == 1, active)
        check('station cards: aria-current marks exactly the selected card', cur == 1, cur)
        pg.locator('#stList .st-hit').nth(4).focus()
        pg.keyboard.press('Space')
        pg.wait_for_timeout(400)
        check('station cards: Space also activates, aria-current follows', pg.evaluate("[...document.querySelectorAll('#stList .st-hit[aria-current=true]')].length") == 1 and pg.evaluate("document.querySelector('#stList .st-item.active')===document.querySelectorAll('#stList .st-item')[4]"))
        pg.locator('#stList .st-fav').first.click()
        pg.wait_for_timeout(250)
        check('station cards: the star still toggles favorites without playing', pg.evaluate("localStorage.getItem('qr_favs')") != '[]' and pg.evaluate("document.querySelector('#stList .st-item.active')===document.querySelectorAll('#stList .st-item')[4]"))
        tab_order = pg.evaluate("""(()=>{const c=document.querySelectorAll('#stList .st-item')[1];return [...c.querySelectorAll('button')].map(b=>b.className.split(' ')[0])})()""")
        check('station cards: tab order = card button then star', tab_order == ['st-hit', 'st-fav'], tab_order)
        check('station cards: no JS errors', not pg.errs, pg.errs)
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: station cards: real buttons', False, str(ex)[:120])
    # ---------- global shortcut must not hijack Space on interactive controls ----------
    try:
        ctx, pg = page(b)
        pg.evaluate("window.__dp=[];window.addEventListener('keydown',e=>{if(e.code==='Space')window.__dp.push([e.target.tagName,e.defaultPrevented])})")
        pg.locator('#stationsCard .cat-pill').nth(2).focus()
        pg.keyboard.press('Space')
        pg.wait_for_timeout(300)
        dp = pg.evaluate('window.__dp')
        check('Space on a focused button is NOT prevented (button activates natively)', dp and dp[-1] == ['BUTTON', False], dp)
        check('Space on a pill really activates it', pg.evaluate("document.querySelectorAll('#stationsCard .cat-pill')[2].classList.contains('cat-pill--active')||document.querySelectorAll('#stationsCard .cat-pill')[2].classList.contains('active')"))
        pg.evaluate("document.activeElement.blur()")
        pg.keyboard.press('Space')
        pg.wait_for_timeout(200)
        dp2 = pg.evaluate('window.__dp')
        check('Space with no control focused still triggers the play/pause shortcut', dp2[-1][1] is True, dp2)
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: global shortcut must not hijack Space on interactive controls', False, str(ex)[:120])
    # ---------- reciter / surah buttons ----------
    try:
        ctx, pg = page(b)
        pg.locator('#reciteCard').scroll_into_view_if_needed()
        pg.wait_for_timeout(1200)
        check('reciters: buttons with names, no tabindex divs', pg.evaluate("document.querySelectorAll('#rcRecitersList .st-item[tabindex]').length") == 0 and pg.evaluate("[...document.querySelectorAll('#rcRecitersList .st-hit')].every(h=>/^عرض سور /.test(h.getAttribute('aria-label')))") and pg.evaluate("document.querySelectorAll('#rcRecitersList .st-hit').length") >= 6)
        pg.locator('#rcRecitersList .st-hit').first.focus()
        pg.keyboard.press('Enter')
        pg.wait_for_timeout(700)
        check('surahs: Enter on a reciter opens the surah list with button items', pg.evaluate("document.querySelectorAll('#rcSurahsList .st-hit').length") >= 5 and pg.evaluate("[...document.querySelectorAll('#rcSurahsList .st-hit')].every(h=>/^تشغيل سورة /.test(h.getAttribute('aria-label')))"))
        ctx.close()
        ctx, pg = page(b)
        pg.locator('#reciteCard').scroll_into_view_if_needed()
        pg.wait_for_timeout(1200)
        pg.fill('#rcReciterSearch', 'zzzz')
        pg.wait_for_timeout(400)
        check('reciters: empty search shows message + "مسح البحث" action', pg.evaluate("/لا يوجد قرّاء مطابقون/.test(document.getElementById('rcRecitersList').innerText)") and pg.evaluate("[...document.querySelectorAll('#rcRecitersList button')].some(b=>b.textContent.trim()==='مسح البحث')"))
        pg.evaluate("[...document.querySelectorAll('#rcRecitersList button')].find(b=>b.textContent.trim()==='مسح البحث').click()")
        pg.wait_for_timeout(400)
        check('reciters: clear action restores the list', pg.evaluate("document.querySelectorAll('#rcRecitersList .st-hit').length") >= 6 and pg.evaluate("document.getElementById('rcReciterSearch').value") == '')
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: reciter / surah buttons', False, str(ex)[:120])
    # ---------- hero CTA ----------
    try:
        ctx, pg = page(b, extra="localStorage.setItem('qr_last','%s');" % '__LAST__')
        sid = pg.evaluate("document.querySelectorAll('#stList .st-item')[3].getAttribute('data-id')")
        ctx.close()
        ctx, pg = page(b, extra="localStorage.setItem('qr_last','%s');" % sid)
        y0 = pg.evaluate('scrollY')
        pg.click('.hero-primary')
        pg.wait_for_timeout(1200)
        title = pg.evaluate("document.getElementById('npTitle')&&document.getElementById('npTitle').textContent")
        expect = pg.evaluate("document.querySelectorAll('#stList .st-item')[3].querySelector('.st-name').textContent")
        check('hero CTA: starts the LAST radio station (not just scroll)', title == expect and pg.evaluate("document.querySelectorAll('#stList .st-item.active').length") == 1, (title, expect))
        check('hero CTA: scrolls to the player', pg.evaluate('scrollY') > y0 + 100)
        n_aud = pg.evaluate("document.querySelectorAll('audio').length")
        pg.click('.hero-primary')
        pg.wait_for_timeout(500)
        check('hero CTA: second click while busy does not restart/duplicate audio', pg.evaluate("document.querySelectorAll('audio').length") == n_aud)
        check('hero CTA: no JS errors', not pg.errs, pg.errs)
        ctx.close()
        ctx, pg = page(b)
        pg.click('.hero-primary')
        pg.wait_for_timeout(1000)
        first = pg.evaluate("document.querySelectorAll('#stList .st-item')[0].querySelector('.st-name').textContent")
        check('hero CTA: with no history plays the default (first) station', pg.evaluate("document.getElementById('npTitle').textContent") == first)
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: hero CTA', False, str(ex)[:120])
    # ---------- numerals: Arabic-Indic everywhere ----------
    try:
        ctx, pg = page(b)
        found = {}
        found['home'] = pg.evaluate(LATIN)
        pg.locator('#prayerSection').scroll_into_view_if_needed()
        pg.wait_for_timeout(1200)
        found['prayer'] = pg.evaluate(LATIN)
        pg.get_by_text('أذكار الصباح').first.click()
        pg.wait_for_timeout(600)
        found['azkar'] = pg.evaluate(LATIN)
        pg.click('#tbRing')
        pg.wait_for_timeout(300)
        found['tasbih'] = pg.evaluate(LATIN)
        pg.locator('#reciteCard').scroll_into_view_if_needed()
        pg.wait_for_timeout(1000)
        pg.locator('#rcRecitersList .st-hit').first.click()
        pg.wait_for_timeout(600)
        found['recitations'] = pg.evaluate(LATIN)
        pg.locator('#settingsCard').scroll_into_view_if_needed()
        pg.wait_for_timeout(500)
        found['settings'] = pg.evaluate(LATIN)
        pg.evaluate("document.querySelector('[data-qibla-open]').click()")
        pg.wait_for_timeout(1800)
        found['qibla'] = pg.evaluate(LATIN)
        for k, v in found.items():
            check('numerals: no Latin digits in visible text — ' + k, not v, v[:4])
        greg = pg.evaluate("document.getElementById('calGreg').textContent")
        check('numerals: Gregorian date uses Arabic-Indic digits', bool(re.search(r'[\u0660-\u0669]', greg)) and not re.search(r'[0-9]', greg), greg)
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: numerals: Arabic-Indic everywhere', False, str(ex)[:120])
    # ---------- aria-valuetext / madhab / empty state ----------
    try:
        ctx, pg = page(b)
        vt = pg.evaluate("[document.getElementById('vslider').getAttribute('aria-valuetext'),document.getElementById('rcVolume').getAttribute('aria-valuetext')]")
        check('sliders: volume exposes aria-valuetext in Arabic digits', vt[0] and re.search(r'[\u0660-\u0669]', vt[0]), vt)
        check('madhab button >= 24x24 px', pg.evaluate("(()=>{const r=document.querySelector('.pt-madhab-btn').getBoundingClientRect();return r.width>=24&&r.height>=24})()"))
        pg.click('#stationsCard .cat-pill:has-text("المفضلة")')
        pg.wait_for_timeout(300)
        fav_msg = pg.evaluate("document.getElementById('stList').innerText")
        check('favorites filter empty state = the helpful favorites message', 'النجمة' in fav_msg, fav_msg[:80])
        pg.fill('.st-search-input', 'zzzz')
        pg.wait_for_timeout(300)
        check('search with no results keeps the generic message', 'مطابقة' in pg.evaluate("document.getElementById('stList').innerText"))
        ctx.close()

    except Exception as ex:
        check('SECTION CRASHED: aria-valuetext / madhab / empty state', False, str(ex)[:120])
    # ---------- tablet ----------
    try:
        for w, h in [(768, 1024), (834, 1112), (900, 1000), (1023, 900)]:
            ctx, pg = page(b, w, h)
            m = pg.evaluate("""()=>{const q=s=>document.querySelector(s);const cols=e=>e?getComputedStyle(e).gridTemplateColumns.split(' ').length:0;const nav=q('#bnav').getBoundingClientRect();return {ov:document.documentElement.scrollWidth-document.documentElement.clientWidth,st:cols(q('#stList')),sw:q('#stList').scrollWidth-q('#stList').clientWidth,pt:cols(q('.pt-grid')),rc:cols(q('#reciteCard')),navW:Math.round(nav.width),navC:Math.abs((nav.left+nav.right)/2-innerWidth/2)<2,navVis:getComputedStyle(q('#bnav')).display!=='none',dnav:getComputedStyle(q('.dnav')).display!=='none'}}""")
            check('tablet %d: no horizontal overflow' % w, m['ov'] <= 0, m)
            check('tablet %d: stations are a grid (>=2 cols), not a strip' % w, m['st'] >= 2 and m['sw'] <= 1, m)
            check('tablet %d: prayer grid 3 cols, recitations 2 panes' % w, m['pt'] == 3 and m['rc'] == 2, m)
            check('tablet %d: bottom nav centered, <=640px, desktop sidebar hidden' % w, m['navVis'] and m['navC'] and m['navW'] <= 640 and not m['dnav'], m)
            check('tablet %d: no JS errors' % w, not pg.errs, pg.errs)
            ctx.close()
        for w in (1024, 1280, 1920):
            ctx, pg = page(b, w, 900)
            sw = pg.evaluate("document.querySelector('#stList').scrollWidth-document.querySelector('#stList').clientWidth")
            check('desktop %d: stations grid has no horizontal strip (bug fix)' % w, sw <= 1, sw)
            ctx.close()
        # v5.6: phone shows a vertical list (first 5 + «عرض الكل»), never a horizontal strip
        ctx, pg = page(b, 390, 844)
        check('phone 390: stations are a vertical list with no horizontal strip (v5.6)', pg.evaluate("document.querySelector('#stList').scrollWidth<=document.querySelector('#stList').clientWidth+1"))
        check('phone 390: «عرض الكل» button exists and is >=44px tall', pg.evaluate("(()=>{const m=document.getElementById('stMore');return !!m&&!m.hidden&&m.getBoundingClientRect().height>=44})()"))
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: tablet', False, str(ex)[:120])
    b.close()
srv.terminate()
for n, ok, d in res:
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else '  -> ' + str(d)[:200]))
print('\nTOTAL %d  PASS %d  FAIL %d' % (len(res), sum(ok for _, ok, _ in res), sum(not ok for _, ok, _ in res)))
raise SystemExit(0 if all(ok for _, ok, _ in res) else 1)
