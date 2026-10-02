import os
import subprocess, time, json, sys
from playwright.sync_api import sync_playwright

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8797'], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8797/index.html'


def route(r):
    return r.continue_() if '127.0.0.1' in r.request.url else r.abort()


def today():
    t = time.localtime()
    return '%04d-%02d-%02d' % (t.tm_year, t.tm_mon, t.tm_mday)


XSS = '<img src=x onerror="window.__xss=1">'
loc_ok = {"lat": 21.3891, "lon": 39.8579, "city": "x", "country": "y", "countryCode": "SA", "timezone": "Asia/Riyadh", "src": "fallback"}


def prayers(mut):
    base = [{"key": k, "nameAr": k, "icon": "<svg/>", "timeStr": "05:00 ص", "ts": 4102444800000 + i * 3600000} for i, k in enumerate(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'])]
    mut(base)
    return {"date": today(), "lat": 21.3891, "lon": 39.8579, "madhab": "shafi", "prayers": base}


def px(i, field):
    def m(b):
        b[i][field] = XSS
    return m


CASES = [
    ('XSS in cached prayer nameAr', {'qr_prayers_v3': json.dumps(prayers(px(0, 'nameAr')))}),
    ('XSS in cached prayer icon', {'qr_prayers_v3': json.dumps(prayers(px(0, 'icon')))}),
    ('XSS in cached prayer timeStr', {'qr_prayers_v3': json.dumps(prayers(px(0, 'timeStr')))}),
    ('cached prayers = number', {'qr_prayers_v3': json.dumps({"date": today(), "lat": 21.3891, "lon": 39.8579, "madhab": "shafi", "prayers": 5})}),
    ('cached prayers = [] ', {'qr_prayers_v3': json.dumps({"date": today(), "lat": 21.3891, "lon": 39.8579, "madhab": "shafi", "prayers": []})}),
    ('cached prayers with null items', {'qr_prayers_v3': json.dumps({"date": today(), "lat": 21.3891, "lon": 39.8579, "madhab": "shafi", "prayers": [None, 5]})}),
    ('XSS in cached location city', {'qr_location_v3': json.dumps({"ts": int(time.time() * 1000), "data": dict(loc_ok, city=XSS)})}),
    ('location lat as string', {'qr_location_v3': json.dumps({"ts": int(time.time() * 1000), "data": dict(loc_ok, lat="abc")})}),
    ('location data = number', {'qr_location_v3': json.dumps({"ts": int(time.time() * 1000), "data": 7})}),
    ('qibla cache garbage', {'qr_qibla_cache_v1': json.dumps({"ts": int(time.time() * 1000), "data": {"bearing": "x", "lat": None}})}),
    ('azprog = null', {'qr_azprog': 'null'}),
    ('azprog = 5', {'qr_azprog': '5'}),
    ('azprog = "x"', {'qr_azprog': '"x"'}),
    ('tasbih count negative', {'qr_tb': '-3'}),
    ('tasbih target negative', {'qr_tgt': '-5'}),
    ('tasbih target huge', {'qr_tgt': '99999999999999'}),
    ('favorites = string', {'qr_favs': '"abc"'}),
]

bad = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, store in CASES:
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        ctx.route('**/*', route)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:100]))
        init = ''.join("localStorage.setItem(%s,%s);" % (json.dumps(k), json.dumps(v)) for k, v in store.items())
        pg.add_init_script("if(!sessionStorage.getItem('_i')){sessionStorage.setItem('_i','1');%s}" % init)
        pg.goto(B)
        pg.wait_for_timeout(1800)
        pg.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        pg.wait_for_timeout(300)
        xss = pg.evaluate('window.__xss === 1')
        tb = pg.evaluate("(document.getElementById('tbNum')||{}).textContent")
        prayer_items = pg.evaluate("document.querySelectorAll('#prayerSection .pt-prayer-item').length")
        status = 'FAIL' if (errs or xss or tb.startswith('-')) else 'ok  '
        if status == 'FAIL':
            bad.append(name)
        print(status, name.ljust(34), '| xss=%s tbNum=%s prayerItems=%s' % (xss, tb, prayer_items), errs[:1])
        ctx.close()
    b.close()
srv.terminate()
print('\nFAILING:', len(bad), bad)
