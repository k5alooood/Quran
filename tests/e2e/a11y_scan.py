import os
import subprocess, time, json, sys
from playwright.sync_api import sync_playwright

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8801'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8801/index.html'
RIW = {"riwayat": [{"id": 1, "name": "حفص عن عاصم"}, {"id": 2, "name": "ورش عن نافع"}]}
REC = {"reciters": [{"id": i, "name": "القارئ %d" % i, "moshaf": [{"id": i, "name": "x", "server": "https://srv.example/%d/" % i, "surah_list": "1,2,3", "surah_total": 3, "moshaf_type": 11}]} for i in range(1, 4)]}


def route(r):
    u = r.request.url
    if 'mp3quran.net/api/v3/riwayat' in u:
        return r.fulfill(json=RIW)
    if 'mp3quran.net/api/v3/reciters' in u:
        return r.fulfill(json=REC)
    return r.continue_() if '127.0.0.1' in u else r.abort()


JS = r'''
() => {
  const parse = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => { const a = top.a + bot.a * (1 - top.a); if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a, g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a, b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a, a }; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { let x = lum(a), y = lum(b); if (x < y) [x, y] = [y, x]; return (x + .05) / (y + .05); };
  const stops = el => { for (let n = el; n; n = n.parentElement) { const bi = getComputedStyle(n).backgroundImage; if (bi && bi !== 'none' && /gradient/.test(bi)) { const m = [...bi.matchAll(/rgba?\(([^)]+)\)/g)].map(x => { const p = x[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }).filter(c => c.a >= .5); if (m.length) return m; } if (n.tagName === 'BODY') break; } return null; };
  const bgOf = el => { const layers = []; let grad = false; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); const c = parse(cs.backgroundColor); if (cs.backgroundImage && cs.backgroundImage !== 'none') grad = true; if (c && c.a > 0) { layers.push(c); if (c.a >= .99) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; const root = parse(getComputedStyle(document.body).backgroundColor); if (root && root.a > 0) acc = root; for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc); return { c: acc, grad }; };
  const out = { contrast: [], noName: [], tiny: [], headings: [], imgNoAlt: [], inputsNoLabel: [], dupIds: [], landmarks: {}, tabNoFocusStyle: 0 };
  const seen = new Set();
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 1).map(n => n.textContent.trim()).join(' ');
    if (own) {
      const fg0 = parse(cs.color); const { c: bg, grad } = bgOf(el);
      const fgA = { r: fg0.r, g: fg0.g, b: fg0.b, a: fg0.a * (parseFloat(cs.opacity) || 1) }; const fg = over(fgA, bg); const st = grad ? stops(el) : null;
      const fs = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
      const large = fs >= 24 || (fs >= 18.66 && bold);
      const need = large ? 3 : 4.5; let cr = ratio(fg, bg); if (st) { cr = Math.min(...st.map(b2 => ratio(over(fgA, over(b2, bg)), over(b2, bg)))); }
      if (cr < need) { const key = (el.id || el.className || el.tagName).toString().slice(0, 40) + '|' + own.slice(0, 22); if (!seen.has(key)) { seen.add(key); out.contrast.push([key, +cr.toFixed(2), need, grad ? 'gradient-bg(approx)' : 'solid']); } }
      if (fs < 11) out.tiny.push([(el.className || el.tagName).toString().slice(0, 30), fs]);
    }
  });
  document.querySelectorAll('button,[role=button],a[href]').forEach(el => {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect(); if (r.width < 2) return;
    if (el.closest('[aria-hidden="true"]')) return;  /* زخرفي عمدًا (مثل tbTap: الحلقة هي عنصر التحكم) */
    const name = ((el.getAttribute('aria-label') || '').trim() || (el.textContent || '').trim() || (el.title || '').trim());
    if (!name) out.noName.push((el.id || el.className || el.tagName).toString().slice(0, 40));
  });
  out.headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => getComputedStyle(h).display !== 'none').map(h => h.tagName + ':' + h.textContent.trim().slice(0, 24));
  document.querySelectorAll('img').forEach(i => { if (!i.hasAttribute('alt')) out.imgNoAlt.push(i.src.slice(-30)); });
  document.querySelectorAll('input,select,textarea').forEach(i => { if (i.type === 'hidden') return; const has = i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || (i.id && document.querySelector('label[for="' + i.id + '"]')) || i.closest('label') || i.placeholder; if (!has) out.inputsNoLabel.push((i.id || i.className).toString().slice(0, 30)); });
  out.landmarks = { main: document.querySelectorAll('main,[role=main]').length, nav: document.querySelectorAll('nav,[role=navigation]').length, header: document.querySelectorAll('header,[role=banner]').length, footer: document.querySelectorAll('footer,[role=contentinfo]').length, lang: document.documentElement.lang, dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction, skipLink: !!document.querySelector('a.skip-link,a[href="#main"],a[href="#player"]') };
  out.liveRegions = document.querySelectorAll('[aria-live],[role=status],[role=alert]').length;
  out.ariaHiddenFocusable = [...document.querySelectorAll('[aria-hidden="true"] a[href],[aria-hidden="true"] button,[aria-hidden="true"] [tabindex="0"]')].filter(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0).map(e => (e.id || e.className).toString().slice(0, 30));
  out.roleListitemParents = [...document.querySelectorAll('[role=listitem]')].filter(e => !e.parentElement.closest('[role=list]')).length;
  return out;
}
'''

with sync_playwright() as p:
    b = p.chromium.launch()
    res = {}
    for theme in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        ctx.route('**/*', route)
        pg = ctx.new_page()
        pg.add_init_script("localStorage.setItem('qr_theme','%s')" % theme)
        pg.goto(B)
        pg.wait_for_timeout(1600)
        pg.evaluate("window.QuranPWAInstall&&window.QuranPWAInstall.showManual()")
        pg.wait_for_timeout(500)
        # open a reciter so surah list + controls exist
        pg.locator('#reciteCard').scroll_into_view_if_needed()
        pg.wait_for_timeout(700)
        r = pg.evaluate(JS)
        # keyboard: first 40 Tab stops -> do they all have a visible focus indicator?
        pg.evaluate('window.scrollTo(0,0);document.activeElement&&document.activeElement.blur()')
        nofocus = []
        stops = 0
        for i in range(45):
            pg.keyboard.press('Tab')
            info = pg.evaluate("""()=>{const e=document.activeElement;if(!e||e===document.body)return null;const cs=getComputedStyle(e);const ol=cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0;const bs=cs.boxShadow&&cs.boxShadow!=='none';return {n:(e.id||e.className||e.tagName).toString().slice(0,34),vis:ol||bs}}""")
            if info:
                stops += 1
                if not info['vis']:
                    nofocus.append(info['n'])
        r['tabStops'] = stops
        r['tabNoVisibleFocus'] = sorted(set(nofocus))
        res[theme] = r
        ctx.close()
    b.close()
srv.terminate()
for theme, r in res.items():
    print('=========', theme)
    print('landmarks:', r['landmarks'], '| liveRegions:', r['liveRegions'])
    print('headings:', r['headings'])
    print('buttons/links without accessible name:', r['noName'])
    print('imgs without alt:', r['imgNoAlt'], '| inputs without label:', r['inputsNoLabel'])
    print('aria-hidden containing focusable:', r['ariaHiddenFocusable'], '| role=listitem outside role=list:', r['roleListitemParents'])
    print('text <11px:', r['tiny'][:8])
    print('tab stops (first 45 presses):', r['tabStops'], '| without visible focus ring:', r['tabNoVisibleFocus'])
    print('CONTRAST FAILURES (%d):' % len(r['contrast']))
    for c in r['contrast'][:25]:
        print('   ', c)
