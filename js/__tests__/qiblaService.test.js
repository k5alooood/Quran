'use strict';
const QiblaService = require('/home/claude/quran_work/js/qiblaService.js');

let pass = 0, fail = 0;
function assertClose(actual, expected, tol, label) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + ' → got ' + actual.toFixed(2) + ', expected ~' + expected + ' (±' + tol + ')');
  ok ? pass++ : fail++;
}
function assertEq(actual, expected, label) {
  const ok = actual === expected;
  console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + ' → got ' + actual + ', expected ' + expected);
  ok ? pass++ : fail++;
}

console.log('=== Qibla bearing — reference cities ===');
// مراجع تقريبية معروفة (درجات من الشمال، بالساعة) — نطاق تسامح واسع نسبيًا لأن المصادر المرجعية تختلف قليلًا حسب دقة الإحداثيات المستخدمة
assertClose(QiblaService.calculateQiblaBearing(25.2048, 55.2708), 258.6, 3, 'Dubai');
assertClose(QiblaService.calculateQiblaBearing(30.0444, 31.2357), 136.0, 3, 'Cairo');
assertClose(QiblaService.calculateQiblaBearing(51.5074, -0.1278), 118.9, 3, 'London');
assertClose(QiblaService.calculateQiblaBearing(40.7128, -74.0060), 58.5, 3, 'New York');
assertClose(QiblaService.calculateQiblaBearing(-6.2088, 106.8456), 295.1, 3, 'Jakarta');
assertClose(QiblaService.calculateQiblaBearing(-33.8688, 151.2093), 277.5, 3, 'Sydney');
assertClose(QiblaService.calculateQiblaBearing(24.5247, 39.5692), 176.2, 3, 'Madinah (يجب أن يكون قريبًا من الجنوب)');
const bMakkah = QiblaService.calculateQiblaBearing(21.3891, 39.8579);
console.log((!isNaN(bMakkah) && bMakkah >= 0 && bMakkah < 360 ? 'PASS' : 'FAIL') + ' — Makkah city center (~1.5km from Kaaba) bearing is a valid normalized value → ' + bMakkah.toFixed(2));
(!isNaN(bMakkah) && bMakkah >= 0 && bMakkah < 360) ? pass++ : fail++;

console.log('\n=== Angle normalization ===');
assertEq(QiblaService.normalizeAngle(0), 0, 'normalize(0)');
assertEq(QiblaService.normalizeAngle(360), 0, 'normalize(360)');
assertEq(QiblaService.normalizeAngle(-1), 359, 'normalize(-1)');
assertEq(QiblaService.normalizeAngle(361), 1, 'normalize(361)');
assertEq(QiblaService.normalizeAngle(720), 0, 'normalize(720)');
assertEq(QiblaService.normalizeAngle(-720), 0, 'normalize(-720)');

console.log('\n=== Shortest angular difference ===');
assertEq(QiblaService.getShortestAngularDifference(359, 1), 2, 'heading=359, qibla=1 → +2');
assertEq(QiblaService.getShortestAngularDifference(1, 359), -2, 'heading=1, qibla=359 → -2');
assertClose(Math.abs(QiblaService.getShortestAngularDifference(180, 0)), 180, 0.001, 'heading=180, qibla=0 → |diff|=180');
assertEq(QiblaService.getShortestAngularDifference(10, 10), 0, 'heading=qibla → 0');

console.log('\n=== Alignment thresholds ===');
assertEq(QiblaService.getAlignmentState(2), 'perfect', 'diff=2 → perfect');
assertEq(QiblaService.getAlignmentState(3), 'perfect', 'diff=3 → perfect (boundary)');
assertEq(QiblaService.getAlignmentState(5), 'aligned', 'diff=5 → aligned (boundary)');
assertEq(QiblaService.getAlignmentState(10), 'close', 'diff=10 → close (boundary)');
assertEq(QiblaService.getAlignmentState(11), 'off', 'diff=11 → off');

console.log('\n=== NaN / stability checks ===');
const b = QiblaService.calculateQiblaBearing(21.422487, 39.826206); // نفس نقطة الكعبة تمامًا
console.log((!isNaN(b) ? 'PASS' : 'FAIL') + ' — bearing at Kaaba itself is not NaN → ' + b);
!isNaN(b) ? pass++ : fail++;

console.log('\n=== Distance sanity ===');
const dMakkahMadinah = QiblaService.calculateDistance(21.3891, 39.8579, 24.5247, 39.5692);
assertClose(dMakkahMadinah, 340, 15, 'Makkah↔Madinah distance ≈ 340km');

console.log('\n---');
console.log('TOTAL: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
