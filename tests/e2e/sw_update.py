"""اختبار تدفق تحديث Service Worker على نسخة مؤقتة من المشروع (لا يعدّل الملفات الأصلية):
نشر نسخة جديدة من sw.js ← يظهر toast ← لا إعادة تحميل تلقائية ← زر «حدّث الآن» ← تفعيل النسخة الجديدة.
تشغيل:  python3 tests/e2e/sw_update.py"""
import os, shutil, subprocess, tempfile, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
tmp = tempfile.mkdtemp(prefix='swtest_')
shutil.copytree(ROOT, tmp, dirs_exist_ok=True, ignore=shutil.ignore_patterns('tests', '.git'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8811'], cwd=tmp, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8811/index.html'
res = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B)
    pg.wait_for_timeout(2500)
    pg.reload()
    pg.wait_for_timeout(1500)
    pg.evaluate('window.__marker = 42')
    keys0 = pg.evaluate('caches.keys()')
    res.append(('v1 service worker controls the page', pg.evaluate('!!navigator.serviceWorker.controller')))
    # publish "v2": new cache names + byte change
    sw = open(os.path.join(tmp, 'sw.js'), encoding='utf-8').read()
    sw = sw.replace("'quran-static-", "'quran-static-NEW-").replace("'quran-pages-", "'quran-pages-NEW-") + '\n// v2 bytes\n'
    open(os.path.join(tmp, 'sw.js'), 'w', encoding='utf-8').write(sw)
    pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())")
    pg.wait_for_timeout(2500)
    toast = pg.evaluate("(()=>{const t=document.getElementById('pwaUpdateToast');return !!t&&t.classList.contains('show')})()")
    res.append(('update toast appears when a new SW is installed', toast))
    res.append(('page was NOT reloaded automatically (audio-safe)', pg.evaluate('window.__marker') == 42))
    res.append(('old caches still intact before user approves', pg.evaluate('caches.keys()') != [] and any('NEW' not in k for k in pg.evaluate('caches.keys()'))))
    pg.click('#pwaUpdateBtn')
    pg.wait_for_timeout(3500)
    res.append(('after approval the page reloads (marker gone)', pg.evaluate('window.__marker') is None))
    keys1 = pg.evaluate('caches.keys()')
    res.append(('new caches created and old ones cleaned', any('NEW' in k for k in keys1) and not any(('NEW' not in k) and k.startswith('quran-') for k in keys1)))
    res.append(('no JS errors during the update flow', not errs))
    print('caches before:', keys0, '| after:', keys1)
    b.close()
srv.terminate()
shutil.rmtree(tmp, ignore_errors=True)
for n, ok in res:
    print(('PASS ' if ok else 'FAIL ') + n)
print('TOTAL %d PASS %d FAIL %d' % (len(res), sum(ok for _, ok in res), sum(not ok for _, ok in res)))
raise SystemExit(0 if all(ok for _, ok in res) else 1)
