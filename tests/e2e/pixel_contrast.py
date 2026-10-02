import os
import subprocess, time, sys, io, statistics
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8803'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8803/index.html'
SELS = ['.hero-kicker', '.np-sub', '.cal-hijri', '.cal-day', '.cal-greg', '.cal-label', '.zi-badge', '.zi-val', '.zi-btn',
        '.pt-country', '.pt-p-time', '.pt-p-name', '.pt-next-time', '.st-badge', '.st-name', '.sec-title', '.app-menu-item',
        '.stg-row-txt', '.ftr', '.skip-link']


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4
    return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2])


def cr(a, b):
    x, y = lum(a), lum(b)
    if x < y:
        x, y = y, x
    return (x + .05) / (y + .05)


def route(r):
    return r.continue_() if '127.0.0.1' in r.request.url else r.abort()


with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        ctx.route('**/*', route)
        pg = ctx.new_page()
        pg.add_init_script("localStorage.setItem('qr_theme','%s')" % theme)
        pg.goto(B)
        pg.wait_for_timeout(1600)
        pg.add_style_tag(content='#bnav,.mini,.pwa-install-prompt{display:none!important}')
        try:
            pg.get_by_text('أذكار الصباح').first.click(); pg.wait_for_timeout(700)
        except Exception:
            pass
        print('=====', theme)
        worst = []
        for sel in ['.zi-badge','.zi-val','.stg-theme-btn.active','.pt-p-name','.pt-p-time','.np-sub','.pt-country','.stg-row-txt','.cal-label','.st-badge']:
            els = pg.locator(sel)
            n = min(els.count(), 4)
            for i in range(n):
                el = els.nth(i)
                try:
                    el.scroll_into_view_if_needed(timeout=1500)
                except Exception:
                    continue
                pg.wait_for_timeout(700)
                if sel=='.skip-link':
                    el.evaluate('e=>e.focus()')
                    pg.wait_for_timeout(400)
                info = el.evaluate("""e=>{const c=getComputedStyle(e);const r=e.getBoundingClientRect();return {color:c.color,fs:parseFloat(c.fontSize),bold:parseInt(c.fontWeight)>=700,op:parseFloat(c.opacity),vis:r.width>2&&r.height>2&&c.visibility!=='hidden'&&c.display!=='none',txt:e.textContent.trim().slice(0,18)}}""")
                if not info['vis'] or not info['txt']:
                    continue
                box = el.bounding_box()
                el.evaluate("e=>{e.dataset._c=e.style.color;e.style.setProperty('color','transparent','important');e.querySelectorAll('*').forEach(x=>x.style.setProperty('color','transparent','important'))}")
                pg.wait_for_timeout(60)
                png = pg.screenshot(clip={'x': max(box['x'], 0), 'y': max(box['y'], 0), 'width': box['width'], 'height': box['height']})
                el.evaluate("e=>{e.style.removeProperty('color');e.querySelectorAll('*').forEach(x=>x.style.removeProperty('color'))}")
                im = Image.open(io.BytesIO(png)).convert('RGB')
                px = list(im.getdata())
                bg = tuple(int(statistics.median(ch)) for ch in zip(*px))
                import re
                m = re.findall(r'[\d.]+', info['color'])
                fg = [float(x) for x in m[:3]]
                a = float(m[3]) if len(m) > 3 else 1.0
                a *= info['op']
                fg = tuple(fg[k] * a + bg[k] * (1 - a) for k in range(3))
                ratio = cr(fg, bg)
                large = info['fs'] >= 24 or (info['fs'] >= 18.66 and info['bold'])
                need = 3 if large else 4.5
                if ratio < need:
                    worst.append((sel, info['txt'], round(ratio, 2), need, info['color']))
        seen = set()
        for w in worst:
            if (w[0], w[2]) in seen:
                continue
            seen.add((w[0], w[2]))
            print('  FAIL', w)
        print('  elements below AA:', len(seen))
        ctx.close()
    b.close()
srv.terminate()
