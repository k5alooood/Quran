"""اختبار بانر التثبيت: (1) يظهر بعد ~15ث عند عدم الإغلاق (عنصر تحكّم إيجابي)،
(2) لا يظهر بعد الإغلاق وإعادة التحميل. يستغرق ~40 ثانية بسبب مهلة الـ15ث الحقيقية.
تشغيل:  python3 tests/e2e/install_banner.py"""
import os, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8810'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8810/index.html'
VISIBLE = """()=>{const e=document.querySelector('.pwa-install-prompt');if(!e)return false;const c=getComputedStyle(e);const r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&parseFloat(c.opacity)>0.5&&r.width>0&&r.bottom>0&&r.top<innerHeight}"""
res = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg = ctx.new_page()
    pg.goto(B)
    pg.wait_for_timeout(5000)
    res.append(('banner NOT shown before the 15s delay', not pg.evaluate(VISIBLE)))
    pg.wait_for_timeout(12000)
    shown = pg.evaluate(VISIBLE)
    res.append(('positive control: banner shows after ~15s when not dismissed', shown))
    if shown:
        pg.click('.pwa-install-close')
        pg.wait_for_timeout(500)
        res.append(('banner hides after clicking close', not pg.evaluate(VISIBLE)))
        keys = pg.evaluate("Object.keys(localStorage).filter(k=>/dismiss/i.test(k))")
        res.append(('dismissal persisted in localStorage', len(keys) >= 1))
        pg.reload()
        pg.wait_for_timeout(18000)
        res.append(('after reload + 18s the dismissed banner stays hidden', not pg.evaluate(VISIBLE)))
    b.close()
srv.terminate()
for n, ok in res:
    print(('PASS ' if ok else 'FAIL ') + n)
print('TOTAL %d PASS %d FAIL %d' % (len(res), sum(ok for _, ok in res), sum(not ok for _, ok in res)))
raise SystemExit(0 if all(ok for _, ok in res) else 1)
