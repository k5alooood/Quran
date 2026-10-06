"""بانر التثبيت بحسب النية (v5.5.0) — مؤقتات حقيقية (~70 ثانية):
  A) زيارة أولى بلا استماع: لا يظهر خلال 28 ثانية (كان يظهر عند 15ث).
  B) زيارة ثانية: يظهر بعد ≈8ث (عنصر تحكّم إيجابي).
  C) زيارة أولى + بدء استماع (حدث qr:played): لا يظهر عند 15ث، ويظهر بعد ≈20ث.
  D) الإغلاق يُحفظ ويبقى مخفيًا بعد إعادة التحميل.
تشغيل:  python3 tests/e2e/install_banner.py"""
import os, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8810'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8810/index.html'
VISIBLE = """()=>{const e=document.querySelector('.pwa-install-prompt');if(!e)return false;const c=getComputedStyle(e);const r=e.getBoundingClientRect();return !e.hidden&&c.display!=='none'&&c.visibility!=='hidden'&&parseFloat(c.opacity)>0.5&&r.width>0&&r.bottom>0&&r.top<innerHeight}"""
res = []


def ck(n, ok, d=''):
    res.append((n, bool(ok), d))


def new_ctx(b, init=''):
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg = ctx.new_page()
    if init:
        pg.add_init_script(init)
    return ctx, pg


with sync_playwright() as p:
    b = p.chromium.launch()
    # A) first visit, no playback
    ctx, pg = new_ctx(b)
    pg.goto(B)
    pg.wait_for_timeout(28000)
    ck('A: first visit without listening -> banner NOT shown after 28s', not pg.evaluate(VISIBLE))
    ck('A: visit counter recorded locally (=1)', pg.evaluate("localStorage.getItem('qr_visits')") == '1', pg.evaluate("localStorage.getItem('qr_visits')"))
    ctx.close()
    # B) returning visit (counter already 1 -> this load makes 2)
    ctx, pg = new_ctx(b, "if(!sessionStorage.getItem('_i')){sessionStorage.setItem('_i','1');localStorage.setItem('qr_visits','1')}")
    pg.goto(B)
    pg.wait_for_timeout(4000)
    ck('B: second visit -> not yet visible at 4s', not pg.evaluate(VISIBLE))
    pg.wait_for_timeout(6000)
    shown = pg.evaluate(VISIBLE)
    ck('B: second visit -> banner shown after ~8s (positive control)', shown)
    if shown:
        pg.click('.pwa-install-close')
        pg.wait_for_timeout(500)
        ck('B: close hides the banner', not pg.evaluate(VISIBLE))
        ck('B: dismissal stored', pg.evaluate("!!localStorage.getItem('quran-pwa-install-dismissed-v24')"))
        pg.reload()
        pg.wait_for_timeout(12000)
        ck('D: after reload (visit 3) the dismissed banner stays hidden', not pg.evaluate(VISIBLE))
    ctx.close()
    # C) first visit + listening
    ctx, pg = new_ctx(b)
    pg.goto(B)
    pg.wait_for_timeout(1500)
    pg.evaluate("document.dispatchEvent(new Event('qr:played'))")
    pg.wait_for_timeout(15000)
    ck('C: 15s after starting to listen -> still hidden (needs 20s)', not pg.evaluate(VISIBLE))
    pg.wait_for_timeout(7000)
    ck('C: ~22s after starting to listen -> banner shown (positive control)', pg.evaluate(VISIBLE))
    ctx.close()
    b.close()
srv.terminate()
for n, ok, d in res:
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else '  -> ' + str(d)))
print('TOTAL %d PASS %d FAIL %d' % (len(res), sum(ok for _, ok, _ in res), sum(not ok for _, ok, _ in res)))
raise SystemExit(0 if all(ok for _, ok, _ in res) else 1)
