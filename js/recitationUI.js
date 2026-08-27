/* القرآن الكريم مباشر — recitationUI.js v25
 * قسم "التلاوات": تصفح الروايات/القراء/السور + مشغل مستقل عند الطلب (منفصل عن مشغل الإذاعة الحي)
 */
'use strict';
const RecitationUI = (function(){

  var audio = document.getElementById('reciteAudio');
  var el = {};
  function g(id){return document.getElementById(id);}

  var riwayatList = [];
  var recitersList = [];
  var selectedRiwayahId = null;
  var selectedReciter = null;
  var selectedMoshaf = null;
  var availableSurahIds = null; // null = كل السور
  var currentSurahNum = -1;
  var repeatMode = 'off'; // off | one | all
  var view = 'browse'; // browse | surahs
  var recSearchQ = '';
  var surahSearchQ = '';
  var seeking = false;
  var vol = 100;
  var muted = false;

  var STORAGE_KEY = 'qr_recite_state';

  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){}}
  function lsJSON(k,v){try{if(v===undefined){var r=localStorage.getItem(k);return r?JSON.parse(r):null;}localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  /* v5: تعقيم أي نص مصدره خارجي (أسماء قرّاء/روايات من mp3quran.net API) قبل إدراجه عبر innerHTML */
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function toArabicDigits(str){
    var d=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    return String(str).replace(/[0-9]/g,function(m){return d[+m];});
  }
  function fmtTime(sec){
    if(!isFinite(sec)||isNaN(sec))return toArabicDigits('0:00');
    var m=Math.floor(sec/60),s=Math.floor(sec%60);
    return toArabicDigits(m+':'+String(s).padStart(2,'0'));
  }
  function status(msg,isErr){
    if(!el.status)return;
    el.status.textContent=msg||'';
    el.status.classList.toggle('err',!!isErr);
  }

  /* ═══ عزل الصوت المتبادل مع الإذاعة الحيّة ═══ */
  function pause(){
    if(audio && !audio.paused) audio.pause();
  }
  function isPlaying(){
    return audio && !audio.paused && !audio.ended;
  }
  function stopRadioIfPlaying(){
    if(window.QuranRadioAPI && window.QuranRadioAPI.isPlaying && window.QuranRadioAPI.isPlaying()){
      window.QuranRadioAPI.stop();
    }
  }
  function announceActive(){
    window.__activeAudioSource = 'recite';
    if(el.miniTitle) el.miniTitle.textContent = selectedReciter ? RecitationService.surahName(currentSurahNum) : 'التلاوات';
    if(el.miniSt) el.miniSt.textContent = selectedReciter ? selectedReciter.name : '';
  }

  /* ═══ عرض السكيلتون أثناء التحميل (نفس نمط قسم الصلاة) ═══ */
  function skeletonList(n){
    var html='<div class="pt-skeleton">';
    for(var i=0;i<n;i++) html+='<div class="pt-sk-bar pulse" style="height:52px;border-radius:14px;margin-bottom:6px;"></div>';
    html+='</div>';
    return html;
  }

  /* ═══ الروايات (Pills) ═══ */
  function renderRiwayatPills(){
    if(!el.pills)return;
    el.pills.innerHTML = riwayatList.map(function(r){
      var active = String(r.id)===String(selectedRiwayahId);
      return '<button type="button" class="cat-pill'+(active?' cat-pill--active':'')+'" data-id="'+r.id+'">'+esc(r.name)+'</button>';
    }).join('');
  }

  function selectRiwayah(id, onLoaded){
    selectedRiwayahId = id;
    selectedReciter = null;
    selectedMoshaf = null;
    renderRiwayatPills();
    ls('qr_recite_riwayah', id);
    el.recitersList.innerHTML = skeletonList(6);
    RecitationService.loadReciters(id).then(function(list){
      recitersList = list;
      renderReciters();
      if(typeof onLoaded==='function') onLoaded(list);
    }).catch(function(){
      recitersList = [];
      el.recitersList.innerHTML = '<div class="pt-error"><p>تعذّر تحميل القرّاء لهذه الرواية</p><button class="pt-retry-btn" id="rcRetryReciters">إعادة المحاولة</button></div>';
      var btn = g('rcRetryReciters');
      if(btn) btn.addEventListener('click', function(){selectRiwayah(id, onLoaded);});
    });
  }

  /* ═══ قائمة القرّاء ═══ */
  function renderReciters(){
    var list = recitersList;
    if(recSearchQ){
      var q = recSearchQ.trim();
      list = list.filter(function(r){return r.name.indexOf(q)!==-1;});
    }
    if(!list.length){
      el.recitersList.innerHTML = '<p class="no-results">لا يوجد قرّاء مطابقون</p>';
      return;
    }
    el.recitersList.innerHTML = '';
    list.forEach(function(r,idx){
      var div=document.createElement('div');
      div.className='st-item';
      div.setAttribute('role','listitem');
      div.tabIndex=0;
      div.style.animationDelay=(idx*25)+'ms';
      div.innerHTML =
        '<div class="st-icon" aria-hidden="true">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M19 11a7 7 0 0 1-14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>'+
        '</div>'+
        '<div class="st-info"><div class="st-name">'+esc(r.name)+'</div></div>';
      div.addEventListener('click', function(){openReciter(r);});
      div.addEventListener('keydown', function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openReciter(r);}});
      el.recitersList.appendChild(div);
    });
  }

  function openReciter(reciter){
    selectedReciter = reciter;
    selectedMoshaf = RecitationService.pickMoshaf(reciter);
    availableSurahIds = RecitationService.moshafSurahIds(selectedMoshaf);
    if(!selectedMoshaf){
      status('لا يوجد مصحف متاح لهذا القارئ', true);
      return;
    }
    ls('qr_recite_reciter', reciter.id);
    view = 'surahs';
    surahSearchQ = '';
    if(el.surahSearch) el.surahSearch.value = '';
    if(el.surahsReciterName) el.surahsReciterName.textContent = reciter.name;
    renderSurahs();
    switchView();
  }

  /* ═══ قائمة السور ═══ */
  function renderSurahs(){
    var ids = [];
    for(var i=1;i<=114;i++){
      if(!availableSurahIds || availableSurahIds.indexOf(i)!==-1) ids.push(i);
    }
    if(surahSearchQ){
      var q = surahSearchQ.trim();
      ids = ids.filter(function(n){return RecitationService.surahName(n).indexOf(q)!==-1;});
    }
    if(!ids.length){
      el.surahsList.innerHTML = '<p class="no-results">لا توجد سور مطابقة</p>';
      return;
    }
    el.surahsList.innerHTML = '';
    ids.forEach(function(num,idx){
      var isActive = selectedReciter && currentSurahNum===num;
      var div=document.createElement('div');
      div.className='st-item'+(isActive?' active':'')+(isActive&&isPlaying()?' playing':'');
      div.setAttribute('role','listitem');
      div.tabIndex=0;
      div.style.animationDelay=(Math.min(idx,20)*20)+'ms';
      div.innerHTML =
        '<div class="st-icon" aria-hidden="true">'+toArabicDigits(num)+'</div>'+
        '<div class="st-info"><div class="st-name">سورة '+RecitationService.surahName(num)+'</div></div>'+
        '<div class="st-eq"><span></span><span></span><span></span></div>';
      div.addEventListener('click', function(){playSurah(num);});
      div.addEventListener('keydown', function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();playSurah(num);}});
      el.surahsList.appendChild(div);
    });
  }

  function switchView(){
    if(view==='surahs'){
      el.browseView.classList.add('hidden');
      el.surahsView.classList.remove('hidden');
    } else {
      el.surahsView.classList.add('hidden');
      el.browseView.classList.remove('hidden');
    }
  }

  /* ═══ حفظ التلاوة للاستماع بدون اتصال (Feature 19) ═══
     يستخدم Cache Storage API مباشرة من الصفحة (بلا حاجة لتدخل Service Worker)،
     ثم عند التشغيل نحوّل الاستجابة المخزَّنة إلى blob URL لتشغيلها فعليًا دون اتصال. */
  var OFFLINE_CACHE = 'quran-offline-audio-v1';
  function offlineSupported(){ return typeof caches!=='undefined'; }
  function isSavedOffline(url){
    if(!offlineSupported()) return Promise.resolve(false);
    return caches.open(OFFLINE_CACHE).then(function(c){return c.match(url);}).then(function(m){return !!m;}).catch(function(){return false;});
  }
  function saveOffline(url){
    if(!offlineSupported()) return Promise.resolve(false);
    return caches.open(OFFLINE_CACHE).then(function(c){
      return fetch(url, {mode:'no-cors'}).then(function(resp){return c.put(url, resp);});
    }).then(function(){return true;}).catch(function(){return false;});
  }
  function removeOffline(url){
    if(!offlineSupported()) return Promise.resolve(false);
    return caches.open(OFFLINE_CACHE).then(function(c){return c.delete(url);}).catch(function(){return false;});
  }
  function resolvePlaybackSrc(url){
    if(!offlineSupported()) return Promise.resolve(url);
    return caches.open(OFFLINE_CACHE).then(function(c){return c.match(url);}).then(function(m){
      if(!m) return url;
      return m.blob().then(function(b){return URL.createObjectURL(b);}).catch(function(){return url;});
    }).catch(function(){return url;});
  }
  function updateOfflineBtnUI(url){
    if(!el.offlineBtn) return;
    isSavedOffline(url).then(function(saved){
      el.offlineBtn.classList.toggle('active', saved);
      el.offlineBtn.setAttribute('aria-pressed', String(saved));
      el.offlineBtn.title = saved ? 'محفوظة بدون اتصال (اضغط للحذف)' : 'حفظ للاستماع بدون اتصال';
      var iconSave = el.offlineBtn.querySelector('.i-offline-save');
      var iconSaved = el.offlineBtn.querySelector('.i-offline-saved');
      if(iconSave) iconSave.classList.toggle('hidden', saved);
      if(iconSaved) iconSaved.classList.toggle('hidden', !saved);
    });
  }

  /* ═══ التشغيل ═══ */
  function playSurah(num, resumeTime){
    if(!selectedMoshaf) return;
    stopRadioIfPlaying();
    currentSurahNum = num;
    var url = RecitationService.audioUrl(selectedMoshaf, num);
    if(audio.src && audio.src.indexOf('blob:')===0){try{URL.revokeObjectURL(audio.src);}catch(e){}}
    resolvePlaybackSrc(url).then(function(src){
      audio.src = src;
      audio.currentTime = resumeTime>0 ? resumeTime : 0;
      audio.play().catch(function(){});
    });
    if(el.downloadBtn){el.downloadBtn.href=url;el.downloadBtn.setAttribute('download','سورة '+RecitationService.surahName(num)+' - '+(selectedReciter?selectedReciter.name:'')+'.mp3');}
    updateOfflineBtnUI(url);
    updateNowPlaying();
    showPlayer();
    renderSurahs();
    saveState();
    announceActive();
  }

  function updateNowPlaying(){
    if(el.surahTitle) el.surahTitle.textContent = currentSurahNum>0 ? 'سورة '+RecitationService.surahName(currentSurahNum) : '—';
    if(el.reciterName) el.reciterName.textContent = selectedReciter ? selectedReciter.name : '—';
  }

  function showPlayer(){
    if(el.player) el.player.classList.remove('hidden');
  }

  function togglePlayPause(){
    if(!audio.src){return;}
    if(audio.paused){stopRadioIfPlaying();audio.play().catch(function(){});announceActive();}
    else audio.pause();
  }

  function playAdjacent(dir, wrap){
    if(!selectedMoshaf) return;
    var ids=[];
    for(var i=1;i<=114;i++){if(!availableSurahIds||availableSurahIds.indexOf(i)!==-1)ids.push(i);}
    if(!ids.length) return;
    var pos = ids.indexOf(currentSurahNum);
    var next = pos + dir;
    if(next<0||next>=ids.length){
      if(!wrap) return;
      next = next<0 ? ids.length-1 : 0; /* v5: تكرار "الكل" يلتف لأول/آخر سورة بدل التوقف الصامت */
    }
    playSurah(ids[next]);
  }

  function cycleRepeat(){
    repeatMode = repeatMode==='off' ? 'one' : (repeatMode==='one' ? 'all' : 'off');
    updateRepeatIcon();
    saveState();
  }
  function updateRepeatIcon(){
    if(!el.repeatBtn)return;
    el.repeatBtn.classList.toggle('active', repeatMode!=='off');
    el.repeatBtn.title = repeatMode==='off' ? 'تكرار: إيقاف' : (repeatMode==='one' ? 'تكرار: سورة واحدة' : 'تكرار: كل السور');
  }

  function saveState(){
    lsJSON(STORAGE_KEY, {
      riwayahId: selectedRiwayahId,
      reciterId: selectedReciter ? selectedReciter.id : null,
      surahNum: currentSurahNum,
      time: audio.currentTime||0,
      repeatMode: repeatMode
    });
  }

  function setVol(v){
    vol=v;
    audio.volume=v/100;
    if(el.volume) el.volume.style.setProperty('--val',v+'%');
    if(el.vpct) el.vpct.textContent=toArabicDigits(v)+'٪';
    ls('qr_recite_vol', v);
  }
  function updateVolIcon(){
    if(!el.muteBtn) return;
    var showMuted = muted || vol===0;
    el.muteBtn.querySelector('.i-vh').classList.toggle('hidden', showMuted);
    el.muteBtn.querySelector('.i-vm').classList.toggle('hidden', !showMuted);
    el.muteBtn.setAttribute('aria-pressed', showMuted ? 'true':'false');
  }

  /* ═══ ربط أحداث الصوت ═══ */
  function bindAudio(){
    audio.addEventListener('play', function(){
      if(el.playBtn){el.playBtn.querySelector('.i-play').classList.add('hidden');el.playBtn.querySelector('.i-pause').classList.remove('hidden');}
      if(el.player) el.player.classList.add('playing');
      if(el.npIcon) el.npIcon.classList.add('playing');
      if(el.playBtn) el.playBtn.classList.add('playing');
      announceActive();
    });
    audio.addEventListener('pause', function(){
      if(el.playBtn){el.playBtn.querySelector('.i-play').classList.remove('hidden');el.playBtn.querySelector('.i-pause').classList.add('hidden');}
      if(el.player) el.player.classList.remove('playing');
      if(el.npIcon) el.npIcon.classList.remove('playing');
      if(el.playBtn) el.playBtn.classList.remove('playing');
      saveState();
    });
    audio.addEventListener('loadedmetadata', function(){
      if(el.durTime) el.durTime.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('timeupdate', function(){
      if(seeking) return;
      if(audio.duration){
        var pct = (audio.currentTime/audio.duration)*100;
        if(el.seek){el.seek.value=pct;el.seek.style.setProperty('--val',pct+'%');}
        if(el.curTime) el.curTime.textContent = fmtTime(audio.currentTime);
      }
      if(Math.floor(audio.currentTime)%5===0 && audio.currentTime>0) saveState();
    });
    audio.addEventListener('ended', function(){
      if(repeatMode==='one'){audio.currentTime=0;audio.play().catch(function(){});}
      else if(repeatMode==='all'){playAdjacent(1, true);}
      else {renderSurahs();}
      saveState();
    });
    audio.addEventListener('error', function(){
      status('تعذّر تشغيل هذه السورة، حاول قارئًا أو سورة أخرى', true);
      if(!audio.paused) audio.pause();
      renderSurahs();
    });
    if(el.seek){
      el.seek.addEventListener('input', function(){
        seeking = true;
        el.seek.style.setProperty('--val', el.seek.value+'%');
        if(audio.duration) el.curTime.textContent = fmtTime((el.seek.value/100)*audio.duration);
      });
      el.seek.addEventListener('change', function(){
        if(audio.duration) audio.currentTime = (el.seek.value/100)*audio.duration;
        seeking = false;
        saveState();
      });
    }
  }

  /* v5: تم تقسيم استعادة الحالة إلى جزأين لتفادي جلب شبكي مزدوج لنفس قائمة القرّاء:
     restoreRepeatMode (بلا شبكة، يُستدعى فورًا) وapplyRestoredReciterState (يعمل على
     قائمة محمَّلة مسبقًا بدل إعادة استدعاء RecitationService.loadReciters من جديد). */
  function restoreRepeatMode(){
    var st = lsJSON(STORAGE_KEY);
    if(st && st.repeatMode){repeatMode=st.repeatMode;updateRepeatIcon();}
    return st;
  }

  function applyRestoredReciterState(st, list){
    if(!st || !st.riwayahId || !st.reciterId) return;
    var r = list.find(function(x){return String(x.id)===String(st.reciterId);});
    if(!r) return;
    selectedReciter = r;
    selectedMoshaf = RecitationService.pickMoshaf(r);
    availableSurahIds = RecitationService.moshafSurahIds(selectedMoshaf);
    if(st.surahNum>0 && selectedMoshaf){
      currentSurahNum = st.surahNum;
      var url = RecitationService.audioUrl(selectedMoshaf, st.surahNum);
      resolvePlaybackSrc(url).then(function(src){ audio.src = src; audio.currentTime = st.time||0; });
      if(el.downloadBtn){el.downloadBtn.href=url;el.downloadBtn.setAttribute('download','سورة '+RecitationService.surahName(st.surahNum)+'.mp3');}
      updateOfflineBtnUI(url);
      updateNowPlaying();
      showPlayer();
    }
  }

  /* يبقى هذا كمسار احتياطي مستقل (يُستخدم فقط إن تعذّر تحميل أي رواية افتراضية في init) */
  function restoreState(){
    var st = restoreRepeatMode();
    if(!st || !st.riwayahId) return;
    selectedRiwayahId = st.riwayahId;
    RecitationService.loadReciters(st.riwayahId).then(function(list){
      recitersList = list;
      applyRestoredReciterState(st, list);
    }).catch(function(){});
  }

  /* ═══ التهيئة ═══ */
  function init(){
    el = {
      pills: g('rcRiwayatPills'),
      recitersList: g('rcRecitersList'),
      recSearch: g('rcReciterSearch'),
      browseView: g('rcBrowseView'),
      surahsView: g('rcSurahsView'),
      surahsList: g('rcSurahsList'),
      surahSearch: g('rcSurahSearch'),
      surahsReciterName: g('rcSurahsReciterName'),
      backBtn: g('rcBackBtn'),
      player: g('rcPlayer'),
      npIcon: g('rcPlayer') ? g('rcPlayer').querySelector('.rc-np-icon') : null,
      surahTitle: g('rcSurahTitle'),
      reciterName: g('rcReciterName'),
      playBtn: g('rcPlayBtn'),
      prevBtn: g('rcPrevBtn'),
      nextBtn: g('rcNextBtn'),
      repeatBtn: g('rcRepeatBtn'),
      downloadBtn: g('rcDownloadBtn'),
      offlineBtn: g('rcOfflineBtn'),
      seek: g('rcSeek'),
      curTime: g('rcCurTime'),
      durTime: g('rcDurTime'),
      volume: g('rcVolume'),
      vpct: g('rcVpct'),
      muteBtn: g('rcMuteBtn'),
      status: g('rcStatus'),
      miniTitle: g('miniTitle'),
      miniSt: g('miniSt')
    };
    if(!audio || !el.pills) return; // القسم غير موجود في الصفحة

    bindAudio();

    if(el.pills) el.pills.addEventListener('click', function(e){
      var btn = e.target.closest('.cat-pill');
      if(!btn) return;
      selectRiwayah(btn.dataset.id);
    });
    if(el.recSearch) el.recSearch.addEventListener('input', function(){
      recSearchQ = el.recSearch.value;
      renderReciters();
    });
    if(el.surahSearch) el.surahSearch.addEventListener('input', function(){
      surahSearchQ = el.surahSearch.value;
      renderSurahs();
    });
    if(el.backBtn) el.backBtn.addEventListener('click', function(){
      view='browse';
      switchView();
    });
    if(el.playBtn) el.playBtn.addEventListener('click', togglePlayPause);
    if(el.prevBtn) el.prevBtn.addEventListener('click', function(){playAdjacent(-1);});
    if(el.nextBtn) el.nextBtn.addEventListener('click', function(){playAdjacent(1);});
    if(el.repeatBtn) el.repeatBtn.addEventListener('click', cycleRepeat);
    if(el.offlineBtn) el.offlineBtn.addEventListener('click', function(){
      if(!selectedMoshaf || currentSurahNum<1) return;
      var url = RecitationService.audioUrl(selectedMoshaf, currentSurahNum);
      el.offlineBtn.disabled = true;
      isSavedOffline(url).then(function(saved){
        var op = saved ? removeOffline(url) : saveOffline(url);
        op.then(function(ok){
          el.offlineBtn.disabled = false;
          updateOfflineBtnUI(url);
          if(!saved && !ok) status('تعذّر الحفظ للاستماع بدون اتصال', true);
        });
      });
    });
    if(el.volume) el.volume.addEventListener('input', function(){
      muted=false;
      setVol(parseInt(el.volume.value,10));
      updateVolIcon();
    });
    if(el.muteBtn) el.muteBtn.addEventListener('click', function(){
      muted=!muted;
      audio.muted=muted;
      updateVolIcon();
    });
    var savedVol = ls('qr_recite_vol');
    var startVol = savedVol!==null && savedVol!==undefined ? parseInt(savedVol,10) : 100;
    if(el.volume) el.volume.value = startVol;
    setVol(startVol);
    updateVolIcon();

    el.recitersList.innerHTML = skeletonList(6);
    RecitationService.loadRiwayat().then(function(list){
      riwayatList = list;
      var savedState = restoreRepeatMode(); /* بلا شبكة — يستعيد وضع التكرار فقط الآن */
      var savedRiwayah = ls('qr_recite_riwayah');
      var defaultId = (savedRiwayah && list.some(function(r){return String(r.id)===String(savedRiwayah);}))
        ? savedRiwayah
        : (list[0] ? list[0].id : null);
      renderRiwayatPills();
      if(defaultId){
        selectedRiwayahId = defaultId;
        renderRiwayatPills();
        var matchesSaved = savedState && savedState.riwayahId && String(savedState.riwayahId)===String(defaultId);
        selectRiwayah(defaultId, matchesSaved ? function(loadedList){
          applyRestoredReciterState(savedState, loadedList);
        } : null);
      } else {
        restoreState(); /* مسار احتياطي فقط إن لم توجد رواية افتراضية على الإطلاق */
      }
    }).catch(function(){
      el.recitersList.innerHTML = '<div class="pt-error"><p>تعذّر تحميل قائمة الروايات، تحقق من الاتصال</p><button class="pt-retry-btn" id="rcRetryRiwayat">إعادة المحاولة</button></div>';
      var btn = g('rcRetryRiwayat');
      if(btn) btn.addEventListener('click', init);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(typeof RecitationService!=='undefined') init();
  });

  var publicApi = {
    pause: pause,
    isPlaying: isPlaying,
    toggle: togglePlayPause
  };
  window.RecitationUI = publicApi;
  return publicApi;
})();
