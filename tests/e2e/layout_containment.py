"""اختبار احتواء التخطيط: (1) لا شيء داخل أي بطاقة يخرج من حدودها على أي عرض،
(2) كل بطاقة لها حشو داخلي ≥10px وأيقونات عناوينها داخل الحشو،
(3) أيقونة كل زر دائري/مربع (svg وحيد) في منتصفه (±1px).
تشغيل:  python3 tests/e2e/layout_containment.py   — Chromium + API مُحاكى."""
import json, os, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8890'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8890/index.html'
RIW = {"riwayat": [{"id": i, "name": n} for i, n in enumerate(["حفص عن عاصم", "ورش عن نافع", "قالون عن نافع", "قنبل عن ابن كثير", "السوسي عن أبي عمرو", "البزي عن ابن كثير", "الدوري عن الكسائي"], 1)]}
NAMES = ["مشاري العفاسي", "ماهر المعيقلي", "ماجد العنزي", "فارس عباد", "سعد الغامدي", "ياسر الدوسري", "محمود الحصري", "عبد الباسط", "أحمد العجمي", "إدريس أبكر", "ناصر القطامي", "هزاع البلوشي"]
REC = {"reciters": [{"id": i + 1, "name": n, "moshaf": [{"id": i + 1, "name": "x", "server": "https://srv.example/%d/" % i, "surah_list": ",".join(str(k) for k in range(1, 115)), "surah_total": 114, "moshaf_type": 11}] } for i, n in enumerate(NAMES)]}
LOC = {"ts": int(time.time() * 1000), "data": {"lat": 25.2, "lon": 55.3, "city": "Dubai", "country": "الإمارات العربية المتحدة", "countryCode": "AE", "timezone": "Asia/Dubai", "src": "ip"}}
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


SPILL = """()=>{const out=[];document.querySelectorAll('.card').forEach(c=>{const r=c.getBoundingClientRect();if(r.width<2)return;
  c.querySelectorAll('*').forEach(e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||s.position==='fixed')return;
    if(e.closest('svg')&&e.tagName!=='svg')return;
    /* عناصر داخل شريط أفقي قابل للتمرير مقصودة */
    for(let p=e.parentElement;p&&p!==c;p=p.parentElement){const ps=getComputedStyle(p);if((ps.overflowX==='auto'||ps.overflowX==='scroll'||ps.overflowX==='hidden')&&p!==e)return;}
    const b=e.getBoundingClientRect();if(b.width<2||b.height<2)return;
    if(b.right>r.right+2||b.left<r.left-2)out.push((c.id||c.className).toString().slice(0,14)+' > '+(e.id||e.className||e.tagName).toString().slice(0,22)+' L'+Math.round(r.left-b.left)+' R'+Math.round(b.right-r.right))})});
  return out.slice(0,6)}"""
PAD = """()=>[...document.querySelectorAll('section.card, .card.pt-section')].filter(c=>c.getBoundingClientRect().width>0).map(c=>{const cs=getComputedStyle(c),r=c.getBoundingClientRect();const ic=c.querySelector('.sec-title svg,.pt-section-title svg');const ir=ic&&ic.getBoundingClientRect();return {id:(c.id||c.className).toString().slice(0,16),pl:parseFloat(cs.paddingLeft),pr:parseFloat(cs.paddingRight),gap:ir?Math.round(Math.min(r.right-ir.right,ir.left-r.left)):null}})"""
CENTER = """()=>[...document.querySelectorAll('button,a')].filter(b=>{const r=b.getBoundingClientRect();const s=[...b.querySelectorAll(':scope > svg')].find(x=>x.getClientRects().length&&getComputedStyle(x).display!=='none');return s&&r.width>=22&&r.width<=64&&r.height>=22&&r.height<=64&&!b.textContent.trim()&&getComputedStyle(b).visibility!=='hidden'&&!b.closest('[aria-hidden="true"]')}).map(b=>{const r=b.getBoundingClientRect(),s=[...b.querySelectorAll(':scope > svg')].find(x=>x.getClientRects().length&&getComputedStyle(x).display!=='none'),sr=s.getBoundingClientRect();
  /* الإزاحة الفعلية للرسم داخل viewBox (يأخذ preserveAspectRatio في الحسبان) */
  const vb=s.viewBox.baseVal;let cx=(sr.left+sr.right)/2,cy=(sr.top+sr.bottom)/2;try{const bb=s.getBBox();const k=Math.min(sr.width/vb.width,sr.height/vb.height);cx=sr.left+sr.width/2+((bb.x+bb.width/2)-(vb.x+vb.width/2))*k;cy=sr.top+sr.height/2+((bb.y+bb.height/2)-(vb.y+vb.height/2))*k}catch(e){}
  return {n:(b.id||b.className).toString().slice(0,26),dx:Math.round(((r.left+r.right)/2-cx)*10)/10,dy:Math.round(((r.top+r.bottom)/2-cy)*10)/10,w:Math.round(r.width)}})"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(320, 700), (390, 844), (768, 1024), (980, 1200), (1024, 900), (1100, 900), (1280, 900), (1366, 800), (1440, 900), (1920, 1000)]:
        ctx = b.new_context(viewport={'width': w, 'height': h})
        ctx.route('**/*', route)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:80]))
        pg.add_init_script("localStorage.setItem('qr_theme','light');localStorage.setItem('quran-pwa-install-dismissed-v24',String(Date.now()));localStorage.setItem('qr_location_v3',%s)" % json.dumps(json.dumps(LOC)))
        pg.goto(B)
        pg.wait_for_timeout(2200)
        pg.locator('#reciteCard').scroll_into_view_if_needed()
        pg.wait_for_timeout(1000)
        sp = pg.evaluate(SPILL)
        check('%dpx: nothing spills outside its card' % w, not sp, sp)
        pads = pg.evaluate(PAD)
        bad = [x for x in pads if x['pl'] < 10 or x['pr'] < 10 or (x['gap'] is not None and x['gap'] < 10)]
        check('%dpx: every card has inner padding >=10px and header icon inside it' % w, not bad, bad)
        if w >= 768:
            st = pg.evaluate("(()=>{const e=document.getElementById('rcRecitersList');return {sw:e.scrollWidth-e.clientWidth,flow:getComputedStyle(e).gridAutoFlow,n:e.querySelectorAll('.st-item').length,clip:[...e.querySelectorAll('.st-item')].filter(c=>{const r=c.getBoundingClientRect(),q=e.getBoundingClientRect();return r.left<q.left-1||r.right>q.right+1}).length}})()")
            check('%dpx: reciters list is a vertical grid, no clipped cards (%s)' % (w, st), st['sw'] <= 1 and st['flow'].startswith('row') and st['clip'] == 0 and st['n'] >= 6, st)
            ph = pg.evaluate("(()=>{const e=document.getElementById('rcSurahsList');return e&&e.children.length===0?getComputedStyle(e,'::before').content:'(has items)'})()")
            check('%dpx: empty surahs pane shows a hint instead of blank space' % w, 'اختر' in ph, ph)
            pg.locator('#rcRecitersList .st-hit').first.click()
            pg.wait_for_timeout(700)
            sv = pg.evaluate("(()=>{const e=document.getElementById('rcSurahsList');return {sw:e.scrollWidth-e.clientWidth,n:e.querySelectorAll('.st-item').length,clip:[...e.querySelectorAll('.st-item')].filter(c=>{const r=c.getBoundingClientRect(),q=e.getBoundingClientRect();return r.left<q.left-1||r.right>q.right+1}).length}})()")
            check('%dpx: surahs list is a vertical grid inside its pane, no clipped cards' % w, sv['sw'] <= 1 and sv['clip'] == 0 and sv['n'] >= 50, sv)
            sp2 = pg.evaluate(SPILL)
            check('%dpx: nothing spills outside the card after opening a reciter' % w, not sp2, sp2)
        ce = pg.evaluate(CENTER)
        offc = [x for x in ce if abs(x['dx']) > 1 or abs(x['dy']) > 1]
        check('%dpx: icon-only buttons are centered (+-1px) [%d checked]' % (w, len(ce)), len(ce) >= 4 and not offc, offc)
        check('%dpx: no horizontal page overflow, no JS errors' % w, pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth') <= 0 and not errs, errs)
        ctx.close()
    b.close()
srv.terminate()
for n, ok, d in res:
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else '  -> ' + str(d)[:230]))
print('\nTOTAL %d  PASS %d  FAIL %d' % (len(res), sum(ok for _, ok, _ in res), sum(not ok for _, ok, _ in res)))
raise SystemExit(0 if all(ok for _, ok, _ in res) else 1)
