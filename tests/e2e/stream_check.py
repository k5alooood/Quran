"""اختبارات v5.8.1: سلامة قائمة المحطات وروابط البث (ثابتة) + أداة tools/stream-check.html بشبكة مُحاكاة
(أساسي حيّ، HLS ميّت، مقاطع مفقودة، ميّت أساسيًا واحتياطيًا). تشغيل:  python3 tests/e2e/stream_check.py"""
import json, os, re, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8895'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
B = 'http://127.0.0.1:8895/index.html'
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



import re, struct
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
app = open(os.path.join(ROOT, 'js', 'app.js'), encoding='utf-8').read()
tool_html = open(os.path.join(ROOT, 'tools', 'stream-check.html'), encoding='utf-8').read()
tool_js = open(os.path.join(ROOT, 'tools', 'stream-check.js'), encoding='utf-8').read()

# ---------------- ثابتة: سلامة قائمة المحطات
blk = app[app.index('var STATIONS'):app.index('];', app.index('var STATIONS'))]
sts = re.findall(r"\{id:'([^']+)',\s*name:'([^']+)'.*?url:'([^']+)'.*?bk:'([^']*)'", blk, re.S)
ids = [s[0] for s in sts]
N = len(sts)
check('stations: 41 entries (9 radios + 32 reciters), unique ids', N == 41 and len(set(ids)) == N, (N, len(set(ids))))
check('stations: order starts Cairo, Sharjah, Saudi (then the other radios) with short names', ids[:3] == ['eg', 'shj', 'sau'] and [s[1] for s in sts[:3]] == ['إذاعة القرآن الكريم القاهرة', 'إذاعة القرآن الكريم الشارقة', 'إذاعة القرآن الكريم السعودية'], [s[:2] for s in sts[:3]])
check('stations: the 9 radios come first (before every reciter) and their names carry no "من"', ids[:9] == ['eg', 'shj', 'sau', 'ksa', 'ksa2', 'qa1', 'qa2', 'tafs', 'ruq'] and all(' من ' not in s[1] for s in sts[:9]), [s[1] for s in sts[:9]])
check('stations: every display name is short (<= 30 characters)', all(len(s[1]) <= 30 for s in sts), [(s[0], len(s[1])) for s in sts if len(s[1]) > 30])
check('stations: every url and backup is https and well-formed', all(re.match(r'^https://[A-Za-z0-9.\-]+/\S+$', s[2]) and re.match(r'^https://[A-Za-z0-9.\-]+/\S+$', s[3]) for s in sts), [s[0] for s in sts if not (s[2].startswith('https://') and s[3].startswith('https://'))])
check('stations: every station has a backup different from its primary', all(s[3] and s[3] != s[2] for s in sts), [s[0] for s in sts if s[3] == s[2]])
hls = sorted(s[0] for s in sts if '.m3u8' in s[2])
check('stations: HLS primaries are exactly sau, ksa, ksa2, qa1, qa2 (everything else is a direct stream)', hls == ['ksa', 'ksa2', 'qa1', 'qa2', 'sau'], hls)
check('stations: sau/ksa/ksa2 (HLS) fall back to a DIRECT stream; the two Qatar streams back each other up', all('.m3u8' not in s[3] for s in sts if s[0] in ('sau', 'ksa', 'ksa2')), [s[0] for s in sts if s[0] in ('sau', 'ksa', 'ksa2') and '.m3u8' in s[3]])
fam = {'radiojar.com', 'holol.com', 'itworkscdn.net', 'qurango.net', 'kwikmotion.com'}
check('stations: all hosts belong to the known providers (radiojar/holol/itworkscdn/qurango/kwikmotion)', all('.'.join(re.match(r'^https://([^/]+)/', s[2]).group(1).split('.')[-2:]).lower() in fam and '.'.join(re.match(r'^https://([^/]+)/', s[3]).group(1).split('.')[-2:]).lower() in fam for s in sts), [s[0] for s in sts])
sw_src = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
check('sw.js BYPASS covers every stream provider host (a missed host would be cached/intercepted by the SW)', all(("'" + h + "'") in sw_src for h in fam), [h for h in fam if ("'" + h + "'") not in sw_src])
byid = {s[0]: s for s in sts}
check('Saudi Quran Radio = official SBA HLS (radioplus.sba.sa channel 4) with the mp3quran radiojar stream as fallback', byid['sau'][2] == 'https://live.kwikmotion.com/sbrksaquranradiolive/ksaquranradio/playlist.m3u8' and byid['sau'][3] == 'https://stream.radiojar.com/0tpy1h0kxtzuv')
check('Qatar Quran Radio x2 = official QMC streams (quranradio.qa), each the fallback of the other', byid['qa1'][2] == 'https://live.kwikmotion.com/qmcquranradiolive/quranradio/playlist.m3u8' and byid['qa2'][2] == 'https://live.kwikmotion.com/qmcquranradio2live/quranradio2/playlist.m3u8' and byid['qa1'][3] == byid['qa2'][2] and byid['qa2'][3] == byid['qa1'][2])
check('Sharjah: primary = direct AAC audio mount (works in <audio>), fallback = official SBA 1080p HLS (needs hls.js)', byid['shj'][2] == 'https://l3.itworkscdn.net/smcquranlive/quranradiolive/icecast.audio' and byid['shj'][3] == 'https://live.kwikmotion.com/smcquranlive/quranradiolive/playlist.m3u8')
# مسارات qurango المستخدمة — مطابقة لواجهة mp3quran الرسمية /api/v3/radios (ومنها ما ورد في ملف التحقق المرفق بتاريخ 2026-10-12)
OFFICIAL_MOUNTS = {'tafseer', 'roqiah', 'abdulbasit_abdulsamad_mojawwad', 'abdulbasit_abdulsamad', 'mahmoud_khalil_alhussary', 'mohammed_siddiq_alminshawi',
                   'mustafa_ismail', 'mahmoud_ali__albanna', 'mohammad_altablaway', 'mohammed_jibreel', 'ahmad_nauina', 'mishary_alafasi', 'yasser_almazroyee',
                   'abdulrahman_alsudaes', 'saud_alshuraim', 'maher', 'saad_alghamdi', 'yasser_aldosari', 'nasser_alqatami', 'ahmad_alajmy', 'ali_alhuthaifi',
                   'abdullah_aljohany', 'abdulmohsen_alqasim', 'mohammed_allohaidan', 'mohammed_ayyub', 'fares_abbad', 'shaik_abu_bakr_al_shatri', 'idrees_abkr',
                   'ali_jaber', 'slaah_bukhatir', 'khalifa_altunaiji', 'omar_alqazabri', 'aloyoon_alkoshi', 'alzain_mohammad_ahmad'}
qs = [s for s in sts if 'qurango.net' in s[2].lower()]
check('qurango stations: primary = backup.qurango.net (host published by the official mp3quran API), fallback = qurango.net, same mount', len(qs) == 34 and all(s[2].startswith('https://backup.qurango.net/radio/') and s[3] == s[2].replace('https://backup.qurango.net/', 'https://qurango.net/') for s in qs), [(s[0], s[2]) for s in qs if not s[2].startswith('https://backup.qurango.net/radio/')])
mounts = {re.search(r'/radio/([^/?]+)$', u).group(1) for s in sts for u in (s[2], s[3]) if 'qurango.net/radio/' in u.lower()}
check('every qurango mount used exists in the official list (no dead mounts like maher_al_muaiqly / tarteel / quran_kareem)', mounts <= OFFICIAL_MOUNTS, sorted(mounts - OFFICIAL_MOUNTS))
check('Haramain HLS URLs equal the official mp3quran live-tv API (win.holol.com quran + sunnah) and fall back to the official Saudi radio stream', byid['ksa'][2] == 'https://win.holol.com/live/quran/playlist.m3u8' and byid['ksa2'][2] == 'https://win.holol.com/live/sunnah/playlist.m3u8' and byid['ksa'][3] == byid['ksa2'][3] == 'https://stream.radiojar.com/0tpy1h0kxtzuv')
m = re.search(r'content="(default-src[^"]*)"', html); m2 = re.search(r'content="(default-src[^"]*)"', tool_html)
check('tool page uses exactly the same CSP as index.html', m and m2 and m.group(1) == m2.group(1))
check('tool page: noindex, no inline script/handlers, loads only local scripts', 'noindex' in tool_html and not re.findall(r'\son[a-z]+\s*=', tool_html) and all('src=' in x for x in re.findall(r'<script[^>]*>', tool_html)))
check('streaming core is untouched by this release: HLS config + backup failover still in app.js', "new Hls({enableWorker:true,lowLatencyMode:true,backBufferLength:90})" in app and 'usingBk=true;setStatus(\'warn\',\'تبديل للخادم الاحتياطي...\')' in app)


def wav(seconds=3, rate=8000):
    n = rate * seconds
    return b'RIFF' + struct.pack('<I', 36 + n) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, rate, rate, 1, 8) + b'data' + struct.pack('<I', n) + bytes([128]) * n


WAV = wav()
CORS = {'access-control-allow-origin': '*'}
DEAD = ('fares_abbad',)  # محطة يُحاكى موتها (الأساسي والاحتياطي)


def mock(route):
    u = route.request.url
    if u.startswith('http://127.0.0.1') or u.startswith('http://localhost'):
        return route.continue_()
    if any(d in u for d in DEAD):
        return route.abort()
    if 'holol.com' in u or 'kwikmotion.com' in u:
        return route.fulfill(status=404, headers=CORS, body='not found')            # HLS الحرمين + SBA + قطر: يُحاكى موتها
    return route.fulfill(status=200, headers=dict(CORS, **{'content-type': 'audio/wav'}), body=WAV)


with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    try:
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        ctx.route('**/*', mock)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
        pg.goto(B.replace('index.html', 'tools/stream-check.html')); pg.wait_for_timeout(1200)
        n = pg.evaluate("document.querySelectorAll('#list .card').length")
        check('tool: loads all stations from js/app.js (same list as the app)', n == N, (n, N))
        # اختبار probe مباشر: انتهاك CSP مُحاكى يُلتقط
        r = pg.evaluate("""(async()=>{const pr=StreamCheck.probe('https://qurango.net/radio/fares_abbad');
          document.dispatchEvent(new SecurityPolicyViolationEvent('securitypolicyviolation',{violatedDirective:'connect-src',blockedURI:'https://blocked.example/x'}));
          const r=await pr;return {ok:r.ok,csp:r.csp,detail:r.detail}})()""")
        check('tool: probe records CSP violations that happen during a check and reports dead links as FAIL', r['ok'] is False and any('blocked.example' in c for c in r['csp']), r)
        pg.click('#runAll')
        for _ in range(300):  # لا نستخدم wait_for_function: التقييم بنص مرفوض بـCSP الصفحة نفسها (script-src بلا unsafe-eval)
            if pg.evaluate("document.getElementById('runAll').disabled===false"): break
            pg.wait_for_timeout(500)
        v = pg.evaluate("""(()=>{const t={};document.querySelectorAll('#list .card').forEach(c=>{t[c.id.slice(2)]=c.querySelector('.tag').className.replace('tag ','')});return {t,rep:document.getElementById('report').value,status:document.getElementById('status').textContent}})()""")
        t = v['t']
        direct_ok = [i for i in ids if i not in ('sau', 'ksa', 'ksa2', 'qa1', 'qa2', 'fares')]
        check('direct streams (radiojar, Sharjah icecast, reciters; mocked alive) are all reported OK', all(t[i] == 'ok' for i in direct_ok), {i: t[i] for i in direct_ok if t[i] != 'ok'})
        check('HLS stations with a dead playlist (sau, ksa, ksa2) → "works via backup" (warn), not silent failure', t['sau'] == 'warn' and t['ksa'] == 'warn' and t['ksa2'] == 'warn', (t['sau'], t['ksa'], t['ksa2']))
        check('Qatar pair both dead → each reports bad (its only backup is the other dead stream)', t['qa1'] == 'bad' and t['qa2'] == 'bad', (t['qa1'], t['qa2']))
        check('station dead on BOTH primary and backup → reported as "bad"', t['fares'] == 'bad', t['fares'])
        rep = v['rep']
        check('report: summary counts match (%d OK, 3 backup, 3 fail) and lists engine + HTTP detail' % (N - 6), ('يعمل %d | عبر الاحتياطي فقط 3 | لا يعمل 3' % (N - 6)) in rep and 'hls.js' in rep and 'HTTP 404' in rep, rep.split('\n')[3:5])
        check('report: includes UA, connection, tested-at timestamp', 'المتصفح:' in rep and 'الاتصال:' in rep and re.search(r'\d{4}-\d{2}-\d{2}T', rep))
        pg.fill('#customUrl', 'https://backup.qurango.net/radio/mix')
        pg.click('#customRun'); pg.wait_for_timeout(4500)
        cu = pg.evaluate("({out:document.getElementById('customOut').textContent,rep:document.getElementById('report').value})")
        check('tool: custom-URL tester plays a pasted link and adds it to the report', '✓ يعمل' in cu['out'] and 'روابط مخصّصة' in cu['rep'] and 'backup.qurango.net/radio/mix' in cu['rep'], cu['out'])
        pg.fill('#customUrl', 'not a url'); pg.click('#customRun'); pg.wait_for_timeout(200)
        check('tool: custom-URL tester rejects non-URLs politely', 'https://' in pg.evaluate("document.getElementById('customOut').textContent"))
        check('tool: finished with the "copy the report" prompt and no page errors', 'اكتمل الفحص' in v['status'] and not errs, (v['status'], errs))
        ctx.close()
    except Exception as ex:
        check('SECTION CRASHED: stream tool', False, str(ex)[:200])
    b.close()

srv.terminate()
for n, ok, d in res:
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else '  -> ' + str(d)[:260]))
print('\nTOTAL %d  PASS %d  FAIL %d' % (len(res), sum(ok for _, ok, _ in res), sum(not ok for _, ok, _ in res)))
raise SystemExit(0 if all(ok for _, ok, _ in res) else 1)
