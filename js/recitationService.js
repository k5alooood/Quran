/* القرآن الكريم مباشر — recitationService.js v25
 * طبقة بيانات قسم "التلاوات": روايات + قراء من mp3quran.net API v3
 * فهرس السور الـ 114 محفوظ محليًا (ثابت لا يتغير) بدل تحميله من الشبكة في كل مرة
 */
'use strict';
const RecitationService = (function(){

  var API = 'https://mp3quran.net/api/v3';

  var SURAHS = [
    'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس',
    'هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه',
    'الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم',
    'لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر',
    'فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق',
    'الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة',
    'الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج',
    'نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس',
    'التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد',
    'الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات',
    'القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر',
    'المسد','الإخلاص','الفلق','الناس'
  ];

  function fetchWithTimeout(url, ms){
    ms = ms || 10000;
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var t = ctrl ? setTimeout(function(){ctrl.abort();}, ms) : null;
    return fetch(url, ctrl ? {signal: ctrl.signal} : {}).then(function(res){
      if(t) clearTimeout(t);
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    }, function(err){
      if(t) clearTimeout(t);
      throw err;
    });
  }

  function loadRiwayat(){
    return fetchWithTimeout(API+'/riwayat?language=ar').then(function(d){
      return d.riwayat || d.data || [];
    });
  }

  function loadReciters(riwayahId){
    return fetchWithTimeout(API+'/reciters?language=ar&riwayah_id='+riwayahId).catch(function(){
      return fetchWithTimeout(API+'/reciters?language=ar&riwayat_id='+riwayahId);
    }).then(function(d){
      return d.reciters || d.data || [];
    });
  }

  function surahName(num){
    var s = SURAHS[num-1];
    return s || ('سورة '+num);
  }

  function audioUrl(moshaf, surahNum){
    if(!moshaf || !moshaf.server) return '';
    var server = moshaf.server.replace(/\/+$/,'');
    var padded = String(surahNum).padStart(3,'0');
    return server + '/' + padded + '.mp3';
  }

  /* بعض القراء عندهم أكثر من مصحف (رواية/نوع تلاوة) — نفضّل مصحف عنده قائمة سور كاملة (114) لو موجود */
  function pickMoshaf(reciter){
    var list = reciter && reciter.moshaf;
    if(!list || !list.length) return null;
    var full = list.find(function(m){
      var count = (m.surah_list||'').split(',').filter(Boolean).length;
      return count >= 110;
    });
    return full || list[0];
  }

  function moshafSurahIds(moshaf){
    if(!moshaf || !moshaf.surah_list) return null; // null = كل السور متاحة (بدون قيد)
    return moshaf.surah_list.split(',').map(function(s){return parseInt(s.trim(),10);}).filter(Boolean);
  }

  return {
    SURAHS: SURAHS,
    loadRiwayat: loadRiwayat,
    loadReciters: loadReciters,
    surahName: surahName,
    audioUrl: audioUrl,
    pickMoshaf: pickMoshaf,
    moshafSurahIds: moshafSurahIds
  };
})();
