#!/usr/bin/env bash
# تشغيل كل الاختبارات محليًا (يتطلب: node، python3 + playwright + chromium).
#   pip install playwright pillow && playwright install chromium
set -u
cd "$(dirname "$0")/.."
status=0
echo "== syntax"; for f in js/*.js sw.js; do node --check "$f" || status=1; done
python3 -c "import json;json.load(open('manifest.json'))" || status=1
echo "== unit (node, mocked)"; node js/__tests__/qiblaService.test.js | tail -1 || status=1; node tests/unit/cacheValidation.test.js | tail -1 || status=1; node tests/unit/countdown.test.js | tail -1 || status=1; node tests/unit/locationCity.test.js | tail -1 || status=1
echo "== e2e (Chromium)"
python3 tests/e2e/regression.py | tail -1 || status=1
python3 tests/e2e/storage_corruption.py | tail -1 || status=1
python3 tests/e2e/sw_update.py | tail -1 || status=1
python3 tests/e2e/phase_ab.py | tail -1 || status=1
python3 tests/e2e/layout_containment.py | tail -1 || status=1
python3 tests/e2e/cro_polish.py | tail -1 || status=1
[ "${SLOW:-0}" = "1" ] && { python3 tests/e2e/install_banner.py | tail -1 || status=1; }   # ~40s
echo "== accessibility (informational)"; python3 tests/e2e/a11y_scan.py | grep -E "CONTRAST FAILURES|without accessible name|without visible focus"
exit $status
