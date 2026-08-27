/* القرآن الكريم مباشر — app.js v25 (namespaced في IIFE لمنع تسريب المتغيرات العامة؛ المنطق والوظائف مطابقة لـ v24 تمامًا) */
'use strict';
(function(){

/* ═══════════════════════════════════════════
   STATIONS — v6 exact URLs
═══════════════════════════════════════════ */
var STATIONS=[
  {id:'eg',    name:'إذاعة القرآن الكريم',        cat:'رسمية', country:'🇪🇬', url:'https://stream.radiojar.com/8s5u5tpdtwzuv',                  bk:'https://n8.radiojar.com/8s5u5tpdtwzuv'},
  {id:'ksa',   name:'بث الحرم المكي — قرآن',      cat:'رسمية', country:'🇸🇦', url:'https://win.holol.com/live/quran/playlist.m3u8',              bk:'https://Qurango.net/radio/tarateel'},
  {id:'ksa2',  name:'بث الحرم المدني — سُنة',     cat:'رسمية', country:'🇸🇦', url:'https://win.holol.com/live/sunnah/playlist.m3u8',             bk:'https://Qurango.net/radio/tarteel'},
  {id:'shj',   name:'إذاعة الشارقة للقرآن',       cat:'رسمية', country:'🇦🇪', url:'https://svs.itworkscdn.net/smcquranlive/quranradiolive/playlist.m3u8', bk:'https://Qurango.net/radio/quran_kareem'},
  {id:'tafs',  name:'إذاعة تفسير القرآن',         cat:'رسمية', country:'📚',  url:'https://qurango.net/radio/tafseer',                           bk:'https://backup.qurango.net/radio/tafseer'},
  {id:'ruq',   name:'إذاعة الرقية الشرعية',       cat:'رسمية', country:'🛡️', url:'https://qurango.net/radio/roqiah',                            bk:'https://backup.qurango.net/radio/roqiah'},
  {id:'basit', name:'عبد الباسط عبد الصمد',       cat:'قراء',  country:'🇪🇬', url:'https://qurango.net/radio/abdulbasit_abdulsamad_mojawwad',   bk:'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad'},
  {id:'husr',  name:'محمود خليل الحصري',          cat:'قراء',  country:'🇪🇬', url:'https://qurango.net/radio/mahmoud_khalil_alhussary',         bk:'https://backup.qurango.net/radio/mahmoud_khalil_alhussary'},
  {id:'minsh', name:'محمد صديق المنشاوي',         cat:'قراء',  country:'🇪🇬', url:'https://qurango.net/radio/mohammed_siddiq_alminshawi',      bk:'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi'},
  {id:'afs',   name:'مشاري بن راشد العفاسي',      cat:'قراء',  country:'🇰🇼', url:'https://qurango.net/radio/mishary_alafasi',                  bk:'https://backup.qurango.net/radio/mishary_alafasi'},
  {id:'sds',   name:'عبد الرحمن السديس',          cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/abdulrahman_alsudaes',             bk:'https://backup.qurango.net/radio/abdulrahman_alsudaes'},
  {id:'shur',  name:'سعود الشريم',                cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/saud_alshuraim',                   bk:'https://backup.qurango.net/radio/saud_alshuraim'},
  {id:'maher', name:'ماهر المعيقلي',              cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/maher_al_muaiqly',                 bk:'https://backup.qurango.net/radio/maher_al_muaiqly'},
  {id:'yasser',name:'ياسر الدوسري',               cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/yasser_aldosari',                  bk:'https://backup.qurango.net/radio/yasser_aldosari'},
  {id:'fares', name:'فارس عباد',                  cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/fares_abbad',                      bk:'https://backup.qurango.net/radio/fares_abbad'},
  {id:'saad',  name:'سعد الغامدي',                cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/saad_alghamdi',                    bk:'https://backup.qurango.net/radio/saad_alghamdi'},
  {id:'jaber', name:'علي جابر',                   cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/ali_jaber',                        bk:'https://backup.qurango.net/radio/ali_jaber'},
  {id:'ayyub', name:'محمد أيوب',                  cat:'قراء',  country:'🇸🇦', url:'https://qurango.net/radio/mohammed_ayyub',                   bk:'https://backup.qurango.net/radio/mohammed_ayyub'},
  {id:'ajm',   name:'أحمد العجمي',                cat:'قراء',  country:'🇰🇼', url:'https://qurango.net/radio/ahmad_alajmy',                     bk:'https://backup.qurango.net/radio/ahmad_alajmy'}
];

/* ═══════════════════════════════════════════
   AZKAR
═══════════════════════════════════════════ */
var AZKAR={
  morning:[
    {t:'﴿ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ﴾\n(آية الكرسي)',tr:'من قرأها حين يُصبح أُجير من الشيطان حتى يُمسي',n:1},
    {t:'﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ﴾ وَالْمُعَوِّذَتَيْن',tr:'من قرأهن حين يُصبح وحين يُمسي كفتهُ من كل شيء — رواه أبو داود',n:3},
    {t:'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ،\nلَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ،\nلَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',tr:'رواه مسلم',n:1},
    {t:'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا،\nوَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',tr:'رواه أبو داود والترمذي',n:1},
    {t:'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ،\nخَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',tr:'سيد الاستغفار — رواه البخاري',n:1},
    {t:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',tr:'من قالها مئة مرة حُطَّت عنه خطاياه — متفق عليه',n:100},
    {t:'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ،\nلَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',tr:'عشر مرات صباحاً — رواه النسائي',n:10},
    {t:'اللَّهُمَّ عَافِنِي فِي بَدَنِي،\nاللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي',tr:'رواه أبو داود وصححه الألباني',n:3},
    {t:'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ،\nعَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',tr:'من قالها سبعاً كفاه الله ما أهمه — رواه أبو داود',n:7},
    {t:'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ\nفِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',tr:'رواه أبو داود والترمذي',n:3},
    {t:'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',tr:'من صلى عليّ مرة صلى الله عليه بها عشراً — رواه مسلم',n:10}
  ],
  evening:[
    {t:'﴿ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ﴾\n(آية الكرسي)',tr:'من قرأها حين يُمسي أُجير من الشيطان حتى يُصبح',n:1},
    {t:'﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ﴾ وَالْمُعَوِّذَتَيْن',tr:'من قرأهن حين يُمسي وحين يُصبح كفتهُ من كل شيء — رواه أبو داود',n:3},
    {t:'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ،\nلَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ،\nلَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',tr:'رواه مسلم',n:1},
    {t:'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا،\nوَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',tr:'رواه أبو داود والترمذي',n:1},
    {t:'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ،\nخَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',tr:'سيد الاستغفار — رواه البخاري',n:1},
    {t:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',tr:'من قالها مئة مرة حُطَّت عنه خطاياه — متفق عليه',n:100},
    {t:'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ\nمِنْ شَرِّ مَا خَلَقَ',tr:'من قالها ثلاثاً لم يضره حمة تلك الليلة — رواه مسلم',n:3},
    {t:'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ\nوَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ\nأَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ',tr:'رواه أبو داود وصححه الألباني',n:4},
    {t:'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ\nفِي الدُّنْيَا وَالآخِرَةِ',tr:'رواه ابن ماجه وأبو داود',n:1},
    {t:'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',tr:'من صلى عليّ مرة صلى الله عليه بها عشراً — رواه مسلم',n:10}
  ]
};

/* ═══════════════════════════════════════════
   CONSTANTS & STATE — v6 exact
═══════════════════════════════════════════ */
var MILESTONES={33:'سُبْحَانَ اللَّهِ ٣٣',66:'الْحَمْدُ لِلَّهِ ٦٦',99:'اللَّهُ أَكْبَرُ ٩٩ ✦',100:'تَمَّتْ المئة 🌟',1000:'ألف تسبيحة ✦✦'};
var TB_TARGETS=[33,66,99,100,1000];
var TB_CIRC=2*Math.PI*82;
var CATS=['الكل','المفضلة','رسمية','قراء'];
var AR='٠١٢٣٤٥٦٧٨٩';

/* — audio: المتغير المباشر كما في v6 — */
var audio=document.getElementById('audioEl');
var hlsInst=null;
var isPlaying=false,isLoading=false,muted=false,vol=80,theme='dark';
var currentSt=null,retryCount=0,usingBk=false,wantPlaying=false,bgRetryTmr=null,bnavCtl=null;
var retryTmr=null,stallTmr=null,silenceTmr=null,tbFlashTmr=null;
var fadeTimer=null,statusTimer=null;
var focusOn=false,ignSrc=false,preloaded=false;
var activeCat='الكل',favIds=new Set();
var stSearchQuery='';
var tbCount=0,tbTarget=99;
var azProg={morning:{},evening:{}};
var isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var MAX_RETRY=4,RETRY_DELAY=3000,STALL_TO=15000,SILENCE_TO=20000,BG_RETRY_DELAY=20000;
var calInterval=null;

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function toAr(n){return String(n).replace(/\d/g,function(d){return AR[+d]})}
function g(id){return document.getElementById(id)}
function ls(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function lg(k){try{return localStorage.getItem(k)}catch(e){return null}}
function h(el,hide){if(el){if(hide)el.classList.add('hidden');else el.classList.remove('hidden')}}

/* ═══════════════════════════════════════════
   ELEMENT REFS
═══════════════════════════════════════════ */
var EL={
  html:document.documentElement,
  npCard:g('npCard'),npSlab:g('npSlab'),npStation:g('npStation'),npTitle:g('npTitle'),
  viz:g('viz'),spwrap:g('spwrap'),ewrap:g('ewrap'),emsg:g('emsg'),rbtn:g('rbtn'),
  strow:g('strow'),sttxt:g('sttxt'),
  pbtn:g('pbtn'),mbtn:g('mbtn'),fpbtn:g('fpbtn'),
  mini:g('mini'),miniTitle:g('miniTitle'),miniSt:g('miniSt'),
  fst:g('fst'),fdiv:g('fdiv'),fexit:g('fexit'),focusbtn:g('focusbtn'),
  sharebtn:g('sharebtn'),thbtn:g('thbtn'),
  vrow:g('vrow'),mutebtn:g('mutebtn'),vslider:g('vslider'),vpct:g('vpct'),
  catPills:g('catPills'),stList:g('stList'),stSearch:g('stSearch'),
  tbTap:g('tbTap'),tbRst:g('tbRst'),tbNum:g('tbNum'),tbArc:g('tbArc'),
  tbFill:g('tbFill'),tbMile:g('tbMile'),tbTargetBtn:g('tbTargetBtn'),tbTargetNum:g('tbTargetNum'),
  tbFlash:g('tbFlash'),tbFlashMsg:g('tbFlashMsg'),
  ml:g('ml'),el:g('el'),
  ftrStatus:g('ftrStatus'),ftrMsg:g('ftrMsg'),
  calHijri:g('calHijri'),calGreg:g('calGreg'),calDay:g('calDay'),
  themeColorMeta:g('themeColorMeta'),
  batterybtn:g('batterybtn')
};

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
function init(){
  loadPrefs();
  updateCalendar();
  calInterval=setInterval(updateCalendar,3600000);
  renderCatSelect();
  renderStations();
  bindAudio();
  bindUI();
  setupObserver();
  bnavCtl=setupBnav();
  buildAzkar('morning');
  buildAzkar('evening');
  drawTasbeeh(false);
  updateTargetBadge();
  setupMediaSession();
  checkOnline();
  handleDeepLinks();
  window.addEventListener('online',function(){
    setStatus('ok','تم استعادة الاتصال بالإنترنت');
    if(wantPlaying && !isPlaying && currentSt){retryCount=0;setStatus('warn','إعادة الاتصال بالبث...');startAudio();}
  });
  window.addEventListener('offline',function(){
    setStatus('err','لا يوجد اتصال بالإنترنت');
    var keepWanting=wantPlaying;
    stop();
    wantPlaying=keepWanting;
  });
  /* v5: تم دمج طلب تثبيت PWA بالكامل في pwa-install.js — نظام واحد فقط بدل نظامين متنافسين */
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){clearTimeout(silenceTmr);silenceTmr=null;}
    else{if(isPlaying&&!audio.paused)resetSilence();}
  });
  if(isIOS){if(EL.vrow)EL.vrow.style.display='none';}
  else{if(EL.vslider){EL.vslider.style.setProperty('--val',vol+'%');drawVol();}}
  audio.setAttribute('playsinline','');
  audio.setAttribute('webkit-playsinline','');
}

/* ═══════════════════════════════════════════
   CALENDAR
═══════════════════════════════════════════ */
var DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
var MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function updateCalendar(){
  var now=new Date();
  if(EL.calGreg)EL.calGreg.textContent=now.getDate()+' '+MONTHS[now.getMonth()]+' '+now.getFullYear();
  if(EL.calDay)EL.calDay.textContent=DAYS[now.getDay()];
  if(EL.calHijri){
    try{EL.calHijri.textContent=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).format(now);}
    catch(e){var h2=gregorianToHijri(now.getFullYear(),now.getMonth()+1,now.getDate());EL.calHijri.textContent=h2.d+' '+['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'][h2.m-1]+' '+h2.y+' هـ';}
  }
}
function gregorianToHijri(y,m,d){
  var jd=Math.floor((1461*(y+4800+Math.floor((m-14)/12)))/4)+Math.floor((367*(m-2-12*Math.floor((m-14)/12)))/12)-Math.floor((3*Math.floor((y+4900+Math.floor((m-14)/12))/100))/4)+d-32075;
  var l=jd-1948440+10632,n=Math.floor((l-1)/10631),ll=l-10631*n+354;
  var j=(Math.floor((10985-ll)/5316))*(Math.floor((50*ll)/17719))+(Math.floor(ll/5670))*(Math.floor((43*ll)/15238));
  ll=ll-(Math.floor((30-j)/15))*(Math.floor((17719*j)/50))-(Math.floor(j/16))*(Math.floor((15238*j)/43))+29;
  return{y:30*n+j-29,m:Math.floor((24*ll)/709),d:ll-Math.floor((709*Math.floor((24*ll)/709))/24)};
}

/* ═══════════════════════════════════════════
   STATUS
═══════════════════════════════════════════ */
function setStatus(type,msg,autohide){
  if(autohide===undefined)autohide=true;
  if(EL.ftrStatus){EL.ftrStatus.className='ftr-status show '+type;}
  if(EL.ftrMsg)EL.ftrMsg.textContent=msg;
  clearTimeout(statusTimer);
  if(autohide)statusTimer=setTimeout(function(){if(EL.ftrStatus)EL.ftrStatus.classList.remove('show')},5000);
}

/* ═══════════════════════════════════════════
   PREFS
═══════════════════════════════════════════ */
function loadPrefs(){
  var sv=parseInt(lg('qr_vol'),10);if(!isNaN(sv))vol=Math.max(0,Math.min(100,sv));
  muted=lg('qr_muted')==='1';
  theme=lg('qr_theme')||'dark';
  tbCount=parseInt(lg('qr_tb'),10)||0;
  tbTarget=parseInt(lg('qr_tgt'),10)||99;
  var fav=lg('qr_favs');if(fav){try{favIds=new Set(JSON.parse(fav))}catch(e){}}
  var ap=lg('qr_azprog');if(ap){try{azProg=JSON.parse(ap)}catch(e){azProg={morning:{},evening:{}}}}
  if(!azProg.morning)azProg.morning={};if(!azProg.evening)azProg.evening={};
  /* تصفير تلقائي يومي: إن تغيّر التاريخ منذ آخر زيارة، تُصفَّر أذكار الصباح/المساء */
  var today=new Date();
  var todayStr=today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var lastDate=lg('qr_azdate');
  if(lastDate&&lastDate!==todayStr){azProg={morning:{},evening:{}};saveAzProg();}
  ls('qr_azdate',todayStr);
  var lastId=lg('qr_last');if(lastId){var s=STATIONS.find(function(x){return x.id===lastId});if(s)currentSt=s;}
  audio.volume=vol/100;audio.muted=muted;
  if(EL.vslider)EL.vslider.value=vol;
  applyTheme(theme,false);
  if(currentSt){
    if(EL.npStation)EL.npStation.textContent=currentSt.name;
    if(EL.npTitle)EL.npTitle.textContent=currentSt.name;
    if(EL.miniTitle)EL.miniTitle.textContent=currentSt.name;
  }
}
function saveFavs(){ls('qr_favs',JSON.stringify(Array.from(favIds)))}
function saveAzProg(){ls('qr_azprog',JSON.stringify(azProg))}
function applyTheme(t,save){
  theme=t;EL.html.setAttribute('data-theme',t);
  if(EL.themeColorMeta)EL.themeColorMeta.setAttribute('content',t==='dark'?'#06150e':'#faf7f0');
  if(save)ls('qr_theme',t);
}

/* ═══════════════════════════════════════════
   STATIONS — custom pill filter
═══════════════════════════════════════════ */
function renderCatSelect(){
  if(!EL.catPills)return;
  EL.catPills.innerHTML='';
  CATS.forEach(function(c){
    var btn=document.createElement('button');
    btn.className='cat-pill'+(c===activeCat?' cat-pill--active':'');
    btn.textContent=c;btn.dataset.cat=c;
    EL.catPills.appendChild(btn);
  });
}
if(document.getElementById('catPills')){
  document.getElementById('catPills').addEventListener('click',function(e){
    var btn=e.target.closest('.cat-pill');if(!btn)return;
    activeCat=btn.dataset.cat;renderCatSelect();renderStations();
  });
}

function getStIcon(st){
  var svg=st.cat==='قراء'?
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" fill-opacity=".14"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>':
    st.id==='tafs'||st.id==='ruq'?
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" fill="currentColor" fill-opacity=".1"/><circle cx="8" cy="14" r="3.5" fill="currentColor" fill-opacity=".15"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="13" x2="19" y2="13"/></svg>':
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 18.5a2.5 2.5 0 0 1-2.5 2.5H17a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h4v4.5z" fill="currentColor" fill-opacity=".15"/><path d="M3 18.5A2.5 2.5 0 0 0 5.5 21H7a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v4.5z" fill="currentColor" fill-opacity=".15"/></svg>';
  return '<div class="st-icon st-icon--svg">'+svg+'</div>';
}

function renderStations(){
  if(!EL.stList)return;
  var list=STATIONS;
  if(activeCat==='المفضلة')list=STATIONS.filter(function(s){return favIds.has(s.id)});
  else if(activeCat!=='الكل')list=STATIONS.filter(function(s){return s.cat===activeCat});
  if(stSearchQuery){
    var q=stSearchQuery.trim().toLowerCase();
    list=list.filter(function(s){return s.name.toLowerCase().indexOf(q)!==-1;});
  }
  if(!list.length){EL.stList.innerHTML='<p class="no-results">لا توجد إذاعات مطابقة</p>';return;}
  EL.stList.innerHTML='';
  list.forEach(function(st,idx){
    var isFav=favIds.has(st.id),isActive=currentSt&&currentSt.id===st.id,isPlay=isActive&&isPlaying;
    var div=document.createElement('div');
    div.className='st-item'+(isActive?' active':'')+(isPlay?' playing':'');
    div.setAttribute('role','listitem');div.setAttribute('data-id',st.id);div.setAttribute('data-cat',st.cat);
    div.tabIndex=0;div.style.animationDelay=(idx*30)+'ms';
    div.innerHTML=getStIcon(st)+
      '<div class="st-info"><div class="st-name">'+st.name+'</div><span class="st-badge">'+st.cat+'</span></div>'+
      '<div class="st-eq"><span></span><span></span><span></span></div>'+
      '<button class="st-fav'+(isFav?' saved':'')+'\" data-id="'+st.id+'" aria-label="'+(isFav?'إزالة من المفضلة':'إضافة للمفضلة')+'">'+
        '<svg viewBox="0 0 24 24" fill="'+(isFav?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'+
      '</button>';
    div.addEventListener('click',function(e){if(e.target.closest('.st-fav'))return;playStation(st);});
    div.querySelector('.st-fav').addEventListener('click',function(e){e.stopPropagation();toggleFav(st.id,this);});
    div.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();playStation(st);}});
    EL.stList.appendChild(div);
  });
}
function toggleFav(id,btn){
  if(favIds.has(id)){favIds.delete(id);btn.classList.remove('saved');btn.setAttribute('aria-label','إضافة للمفضلة');btn.querySelector('svg').setAttribute('fill','none');}
  else{favIds.add(id);btn.classList.add('saved');btn.setAttribute('aria-label','إزالة من المفضلة');btn.querySelector('svg').setAttribute('fill','currentColor');}
  saveFavs();if(activeCat==='المفضلة')renderStations();
}

/* ═══════════════════════════════════════════
   AUDIO ENGINE — v6 verbatim (audio variable)
═══════════════════════════════════════════ */
function fadeAudio(targetVol,duration,onDone){
  clearInterval(fadeTimer);
  var steps=30,interval=duration/steps,start=audio.volume,delta=(targetVol-start)/steps,step=0;
  fadeTimer=setInterval(function(){
    step++;audio.volume=Math.max(0,Math.min(1,start+delta*step));
    if(step>=steps){clearInterval(fadeTimer);audio.volume=targetVol;if(onDone)onDone();}
  },interval);
}

function playStation(st){
  if(!st)return;
  document.querySelectorAll('.st-item').forEach(function(d){d.classList.remove('active','playing');});
  var targetEl=EL.stList?EL.stList.querySelector('[data-id="'+st.id+'"]'):null;
  if(targetEl){targetEl.classList.add('active');targetEl.scrollIntoView({behavior:'smooth',block:'nearest'});}
  currentSt=st;usingBk=false;retryCount=0;wantPlaying=true;clearBgRetry();
  ls('qr_last',st.id);
  if(EL.npStation)EL.npStation.textContent=st.name;
  if(EL.npTitle)EL.npTitle.textContent=st.name;
  if(EL.miniTitle)EL.miniTitle.textContent=st.name;
  if(EL.npCard)EL.npCard.scrollIntoView({behavior:'smooth',block:'nearest'});
  updateMediaMeta(st);clearTmrs();ignSrc=true;
  var doSwitch=function(){
    if(hlsInst){hlsInst.destroy();hlsInst=null;}
    audio.pause();audio.removeAttribute('src');audio.load();audio.volume=0;
    loadUrl(st.url);
  };
  if(isPlaying)fadeAudio(0,400,doSwitch);else doSwitch();
}

var HLS_MAX_INLINE_RECOVERY=3; /* v5: عدد محاولات التعافي الداخلية في hls.js قبل التصعيد لـ handleFail() (خادم احتياطي + توقف نهائي) */
var hlsNetworkRecoveries=0,hlsMediaRecoveries=0;
function loadUrl(url){
  ignSrc=true;
  hlsNetworkRecoveries=0;hlsMediaRecoveries=0;
  if(url.indexOf('.m3u8')!==-1&&typeof Hls!=='undefined'&&Hls.isSupported()){
    hlsInst=new Hls({enableWorker:true,lowLatencyMode:true,backBufferLength:90});
    hlsInst.loadSource(url);hlsInst.attachMedia(audio);
    hlsInst.on(Hls.Events.MANIFEST_PARSED,function(){ignSrc=false;startAudio();});
    hlsInst.on(Hls.Events.FRAG_LOADED,function(){hlsNetworkRecoveries=0;hlsMediaRecoveries=0;});
    hlsInst.on(Hls.Events.ERROR,function(ev,data){
      if(!data.fatal)return;
      /* v5: قبل كانت أخطاء الشبكة/الوسائط الحرجة تُعاد محاولتها إلى الأبد على نفس الرابط
         دون حد أقصى ودون تجربة الخادم الاحتياطي أبدًا. الآن: عدد محدود من محاولات التعافي
         الداخلية في hls.js نفسها، ثم تصعيد لنفس مسار handleFail() المستخدم لبقية الأخطاء
         (خادم احتياطي ثم إعادة محاولة تدريجية ثم توقف نهائي واضح للمستخدم). */
      if(data.type===Hls.ErrorTypes.NETWORK_ERROR){
        hlsNetworkRecoveries++;
        if(hlsNetworkRecoveries<=HLS_MAX_INLINE_RECOVERY){hlsInst.startLoad();return;}
      } else if(data.type===Hls.ErrorTypes.MEDIA_ERROR){
        hlsMediaRecoveries++;
        if(hlsMediaRecoveries<=HLS_MAX_INLINE_RECOVERY){hlsInst.recoverMediaError();return;}
      }
      if(hlsInst){hlsInst.destroy();hlsInst=null;}
      handleFail();
    });
  } else if(url.indexOf('.m3u8')!==-1&&typeof Hls!=='undefined'&&Hls.isSupported()===false&&document.createElement('audio').canPlayType('application/vnd.apple.mpegurl')){
    audio.src=url;ignSrc=false;startAudio();
  } else {
    audio.src=url;ignSrc=false;startAudio();
  }
}

function bindAudio(){
  audio.addEventListener('play',function(){isLoading=true;render('loading');});
  audio.addEventListener('playing',function(){
    isPlaying=true;isLoading=false;retryCount=0;usingBk=false;clearTmrs();clearBgRetry();
    render('playing');setStatus('ok',currentSt?'يُبث الآن: '+currentSt.name:'جارٍ البث');
    if(!muted)fadeAudio(vol/100,500,null);
  });
  audio.addEventListener('pause',function(){if(ignSrc)return;isPlaying=false;isLoading=false;render('idle');});
  audio.addEventListener('waiting',function(){isLoading=true;render('loading');armStall();});
  audio.addEventListener('stalled',function(){if(isPlaying||isLoading){render('loading');armStall();}});
  audio.addEventListener('error',function(){if(ignSrc)return;handleFail();});
  audio.addEventListener('timeupdate',resetSilence);
}

function resetSilence(){
  if(document.hidden)return;
  clearTimeout(silenceTmr);
  if(!audio.paused&&isPlaying)silenceTmr=setTimeout(function(){if(!audio.paused&&isPlaying)handleFail();},SILENCE_TO);
}
function armStall(){clearTimeout(stallTmr);stallTmr=setTimeout(function(){if(!isPlaying&&isLoading)handleFail();},STALL_TO);}
function clearBgRetry(){if(bgRetryTmr){clearTimeout(bgRetryTmr);bgRetryTmr=null;}}
function scheduleBgRetry(){
  clearBgRetry();
  bgRetryTmr=setTimeout(function(){
    if(!wantPlaying||isPlaying)return;
    retryCount=0;
    startAudio();
  },BG_RETRY_DELAY);
}
function handleFail(){
  clearTmrs();
  if(!usingBk&&currentSt&&currentSt.bk&&currentSt.bk!==currentSt.url){
    usingBk=true;setStatus('warn','تبديل للخادم الاحتياطي...');
    if(hlsInst){hlsInst.destroy();hlsInst=null;}
    audio.pause();audio.removeAttribute('src');audio.load();
    loadUrl(currentSt.bk);return;
  }
  retryCount++;
  if(retryCount<=MAX_RETRY){
    setStatus('warn','إعادة الاتصال... ('+retryCount+'/'+MAX_RETRY+')');
    retryTmr=setTimeout(function(){if(!isPlaying)startAudio();},RETRY_DELAY);
  } else {
    isPlaying=false;isLoading=false;render('error');
    if(window.__hlsLoadFailed&&typeof Hls==='undefined'){
      setStatus('err','تعذّر تحميل مكتبة البث — تحقق من اتصالك أو جرّب لاحقاً',false);
    } else if(wantPlaying){
      setStatus('err','انقطع البث — جارِ إعادة المحاولة تلقائيًا كل 20 ثانية',false);
      scheduleBgRetry();
    } else {
      setStatus('err','تعذّر الاتصال — تحقق من الإنترنت',false);
    }
  }
}
function manualRetry(){
  if(!currentSt)return;retryCount=0;usingBk=false;
  if(hlsInst){hlsInst.destroy();hlsInst=null;}
  ignSrc=true;audio.pause();audio.removeAttribute('src');audio.load();
  loadUrl(currentSt.url);
}
function clearTmrs(){clearTimeout(retryTmr);clearTimeout(stallTmr);clearTimeout(silenceTmr);retryTmr=stallTmr=silenceTmr=null;}
function startAudio(){
  if(window.RecitationUI && window.RecitationUI.pause) window.RecitationUI.pause();
  window.__activeAudioSource='radio';
  wantPlaying=true;
  isLoading=true;render('loading');
  var p=audio.play();
  if(p&&p.catch)p.catch(function(e){if(e.name==='NotAllowedError'){isLoading=false;render('idle');}else handleFail();});
}
function stop(){
  wantPlaying=false;clearBgRetry();
  clearTmrs();isPlaying=false;isLoading=false;
  fadeAudio(0,400,function(){if(hlsInst){hlsInst.destroy();hlsInst=null;}audio.pause();if(!muted)audio.volume=vol/100;});
  render('idle');
}
function togglePlay(){
  if(!currentSt&&!isPlaying&&!isLoading){playStation(STATIONS[0]);return;}
  if(isPlaying||isLoading)stop();else startAudio();
}

/* ═══════════════════════════════════════════
   RENDER — v6 exact
═══════════════════════════════════════════ */
function render(state){
  h(EL.viz,true);h(EL.spwrap,true);h(EL.ewrap,true);if(EL.viz)EL.viz.classList.remove('on');
  if(EL.npSlab)EL.npSlab.className='np-slab';
  if(EL.strow)EL.strow.className='strow';
  var play1=EL.pbtn&&EL.pbtn.querySelector('.i-play');
  var pause1=EL.pbtn&&EL.pbtn.querySelector('.i-pause');
  var play2=EL.mbtn&&EL.mbtn.querySelector('.i-play');
  var pause2=EL.mbtn&&EL.mbtn.querySelector('.i-pause');
  var play3=EL.fpbtn?EL.fpbtn.querySelector('.i-play'):null;
  var pause3=EL.fpbtn?EL.fpbtn.querySelector('.i-pause'):null;
  if(state==='playing'){
    h(EL.viz,false);if(EL.viz)EL.viz.classList.add('on');h(play1,true);h(pause1,false);h(play2,true);h(pause2,false);
    if(play3)h(play3,true);if(pause3)h(pause3,false);
    if(EL.pbtn)EL.pbtn.classList.add('playing');
    if(EL.npSlab)EL.npSlab.classList.add('live');
    if(EL.strow)EL.strow.classList.add('live');
    if(EL.npCard)EL.npCard.classList.add('playing');
    if(EL.sttxt)EL.sttxt.textContent='جارٍ البث';
    if(EL.miniSt)EL.miniSt.textContent='جارٍ البث';
    if(EL.fst)EL.fst.textContent='جارٍ البث';
    document.querySelectorAll('.st-item').forEach(function(d){d.classList.toggle('playing',d.getAttribute('data-id')===(currentSt?currentSt.id:''));});
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing';
  } else if(state==='loading'){
    h(EL.spwrap,false);h(play1,false);h(pause1,true);h(play2,false);h(pause2,true);
    if(play3)h(play3,false);if(pause3)h(pause3,true);
    if(EL.pbtn)EL.pbtn.classList.remove('playing');
    if(EL.npSlab)EL.npSlab.classList.add('buf');
    if(EL.strow)EL.strow.classList.add('loading');
    if(EL.npCard)EL.npCard.classList.remove('playing');
    if(EL.sttxt)EL.sttxt.textContent='جارٍ الاتصال';
    if(EL.miniSt)EL.miniSt.textContent='جارٍ الاتصال';
    if(EL.fst)EL.fst.textContent='جارٍ الاتصال';
  } else if(state==='error'){
    h(EL.ewrap,false);h(play1,false);h(pause1,true);h(play2,false);h(pause2,true);
    if(EL.pbtn)EL.pbtn.classList.remove('playing');
    if(EL.strow)EL.strow.classList.add('error');
    if(EL.npCard)EL.npCard.classList.remove('playing');
    if(EL.sttxt)EL.sttxt.textContent='خطأ في الاتصال';
    if(EL.miniSt)EL.miniSt.textContent='خطأ في الاتصال';
    if(EL.fst)EL.fst.textContent='خطأ';
    document.querySelectorAll('.st-item').forEach(function(d){d.classList.remove('playing');});
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';
  } else {
    h(play1,false);h(pause1,true);h(play2,false);h(pause2,true);
    if(play3)h(play3,false);if(pause3)h(pause3,true);
    if(EL.pbtn)EL.pbtn.classList.remove('playing');
    if(EL.npCard)EL.npCard.classList.remove('playing');
    if(EL.sttxt)EL.sttxt.textContent='متوقف';
    if(EL.miniSt)EL.miniSt.textContent='متوقف';
    if(EL.fst)EL.fst.textContent='متوقف';
    document.querySelectorAll('.st-item').forEach(function(d){d.classList.remove('playing');});
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';
  }
}

/* ═══════════════════════════════════════════
   VOLUME
═══════════════════════════════════════════ */
function setVol(v){vol=v;audio.volume=v/100;if(EL.vslider)EL.vslider.style.setProperty('--val',v+'%');drawVol();ls('qr_vol',v);}
function drawVol(){
  var v=muted?0:vol;if(EL.vpct)EL.vpct.textContent=toAr(v)+'٪';
  var ih=EL.mutebtn&&EL.mutebtn.querySelector('.i-vh');
  var il=EL.mutebtn&&EL.mutebtn.querySelector('.i-vl');
  var im=EL.mutebtn&&EL.mutebtn.querySelector('.i-vm');
  if(muted||v===0){h(ih,true);h(il,true);h(im,false);}
  else if(v<40){h(ih,true);h(il,false);h(im,true);}
  else{h(ih,false);h(il,true);h(im,true);}
}

/* ═══════════════════════════════════════════
   TASBIH — target fixed to 99
═══════════════════════════════════════════ */
function drawTasbeeh(animate){
  var pct=tbTarget>0?(tbCount%tbTarget)/tbTarget:0;
  if(tbTarget>0&&tbCount>0&&tbCount%tbTarget===0)pct=1;
  if(EL.tbArc){EL.tbArc.style.strokeDasharray=TB_CIRC;EL.tbArc.style.strokeDashoffset=TB_CIRC*(1-pct);}
  if(EL.tbFill)EL.tbFill.style.width=(pct*100).toFixed(1)+'%';
  if(EL.tbNum)EL.tbNum.textContent=toAr(tbCount);
  var mile=MILESTONES[tbCount];
  if(EL.tbMile){if(mile){EL.tbMile.textContent=mile;EL.tbMile.classList.add('show');}else EL.tbMile.classList.remove('show');}
  if(animate&&EL.tbNum){EL.tbNum.classList.remove('bump');void EL.tbNum.offsetWidth;EL.tbNum.classList.add('bump');}
}
function incTasbeeh(){
  tbCount++;var mile=MILESTONES[tbCount];
  if(mile){showFlash(mile);if(navigator.vibrate)navigator.vibrate([80,40,80,40,120]);}
  else{if(navigator.vibrate)navigator.vibrate(18);}
  if(tbTarget>0&&tbCount===tbTarget){
    showFlash('تَمَّ الْهَدَفُ 🌟\n'+toAr(tbTarget)+' تسبيحة');
    if(navigator.vibrate)navigator.vibrate([100,50,100,50,200]);
    setTimeout(function(){tbCount=0;drawTasbeeh(false);ls('qr_tb',0);},1200);
  }
  drawTasbeeh(true);ls('qr_tb',tbCount);
}
function rstTasbeeh(){tbCount=0;drawTasbeeh(false);ls('qr_tb',0);}
function updateTargetBadge(){
  if(!EL.tbTargetBtn)return;
  if(EL.tbTargetNum) EL.tbTargetNum.textContent=toAr(tbTarget);
  else EL.tbTargetBtn.textContent=toAr(tbTarget); /* احتياطي إن لم يوجد العنصر الداخلي */
  EL.tbTargetBtn.setAttribute('aria-label','تغيير الهدف — الهدف الحالي '+toAr(tbTarget)+' تسبيحة');
}
function cycleTbTarget(){
  var idx=TB_TARGETS.indexOf(tbTarget);
  idx=(idx===-1?0:idx+1)%TB_TARGETS.length;
  var newTarget=TB_TARGETS[idx];
  /* v5: تأكيد بسيط قبل فقدان التقدّم الحالي عند تغيير الهدف — بدل التصفير الصامت */
  if(tbCount>0 && !window.confirm('تغيير الهدف سيصفّر عدّك الحالي ('+toAr(tbCount)+' تسبيحة). متابعة؟')){
    return;
  }
  tbTarget=newTarget;
  ls('qr_tgt',tbTarget);
  updateTargetBadge();
  tbCount=0;ls('qr_tb',0);
  drawTasbeeh(false);
  showFlash('الهدف الجديد: '+toAr(tbTarget)+' تسبيحة');
}
function showFlash(msg){
  if(!EL.tbFlash||!EL.tbFlashMsg)return;
  clearTimeout(tbFlashTmr);EL.tbFlashMsg.textContent=msg;
  EL.tbFlash.classList.remove('show');void EL.tbFlash.offsetWidth;
  EL.tbFlash.classList.add('show');
  tbFlashTmr=setTimeout(function(){EL.tbFlash.classList.remove('show');},1100);
}

/* ═══════════════════════════════════════════
   AZKAR — window.azkarTap for onclick
═══════════════════════════════════════════ */
function buildAzkar(period){
  var container=period==='morning'?EL.ml:EL.el;if(!container)return;
  var data=AZKAR[period],prog=azProg[period]||{},html='';
  data.forEach(function(z,i){
    var cur=prog[i]||0,done=cur>=z.n;
    html+='<div class="zi'+(done?' done':'')+'" id="z_'+period+'_'+i+'">';
    html+='<div class="zi-text">'+z.t.replace(/\n/g,'<br/>')+'</div>';
    html+='<div class="zi-trans">'+z.tr+'</div><div class="zi-footer">';
    html+='<span class="zi-badge">'+(z.n===1?'مرة واحدة':z.n+' مرات')+'</span>';
    if(z.n>1){
      html+='<div class="zi-counter"><span class="zi-val" id="zv_'+period+'_'+i+'">'+toAr(cur)+'/'+toAr(z.n)+'</span>';
      html+='<button class="zi-btn" id="zb_'+period+'_'+i+'" onclick="azkarTap(\''+period+'\','+i+')" '+(done?'disabled':'')+'>'+( done?'✓ تم':'ذِكر')+'</button></div>';
    } else {
      html+='<button class="zi-btn" id="zb_'+period+'_'+i+'" onclick="azkarTap(\''+period+'\','+i+')" '+(done?'disabled':'')+'>'+( done?'✓ تم':'تم')+'</button>';
    }
    html+='</div></div>';
  });
  container.innerHTML=html;
}
function azkarTap(period,idx){
  var z=AZKAR[period][idx];if(!z)return;
  if(!azProg[period])azProg[period]={};
  var cur=(azProg[period][idx]||0)+1;azProg[period][idx]=cur;saveAzProg();
  var card=g('z_'+period+'_'+idx),valEl=g('zv_'+period+'_'+idx),btnEl=g('zb_'+period+'_'+idx);
  if(valEl)valEl.textContent=toAr(cur)+'/'+toAr(z.n);
  if(cur>=z.n){
    if(card)card.classList.add('done');
    if(btnEl){btnEl.textContent='✓ تم';btnEl.disabled=true;}
    showFlash('أحسنت! اكتمل الذكر ✅');
    setTimeout(function(){var nc=g('z_'+period+'_'+(idx+1));if(nc)nc.scrollIntoView({behavior:'smooth',block:'nearest'});},600);
  }
}
window.azkarTap=azkarTap;

/* ═══════════════════════════════════════════
   MISC
═══════════════════════════════════════════ */
function setupObserver(){
  if(!('IntersectionObserver' in window)||!EL.npCard||!EL.mini)return;
  new IntersectionObserver(function(e){EL.mini.classList.toggle('visible',!e[0].isIntersecting);},{threshold:.15}).observe(EL.npCard);
}
/* v5.1: إصلاح جذري لخطأ "الضغط على أيقونة يفتح قسمًا آخر أحيانًا".
   السبب الفعلي: بعض الأقسام (خصوصًا #reciteCard) تُحمَّل بمحتوى ديناميكي عبر شبكة
   (قائمة الروايات/القرّاء) وتكون قصيرة جدًا في اللحظة الأولى (سكيلتون فقط)؛ وحتى ذلك
   الحين، IntersectionObserver القديم كان "يتسابق" مع النقرة أثناء حركة التمرير السلسة
   ويُنشِّط تبويبًا مختلفًا يقع فعليًا داخل نطاق الرصد اللحظي، فيظهر للمستخدم وكأن
   ضغطه على "التلاوات" مثلاً أنشط تبويب "الأذكار" أو غيره. الإصلاح:
   1) عند النقر: تفعيل التبويب الصحيح فورًا (لا ينتظر نتيجة الـ Observer إطلاقًا).
   2) تعليق الـ Observer مؤقتًا طوال مدة حركة التمرير السلسة، فلا يتنافس مع النقرة.
   3) اعتماد أكبر intersectionRatio بدل "أول عنصر متقاطع" لتفادي نتائج غامضة أثناء
      التمرير الحر (بدون نقرة) أيضًا. */
function setupBnav(){
  var items=document.querySelectorAll('.bnav-item');
  if(!items.length)return;
  var targets=[];
  items.forEach(function(a){
    var el=document.getElementById(a.dataset.target);
    if(el)targets.push({el:el,link:a});
  });
  if(!targets.length)return;

  function setActive(link){
    items.forEach(function(a){a.classList.remove('active');a.removeAttribute('aria-current');});
    link.classList.add('active');link.setAttribute('aria-current','page');
  }

  var observerSuspended=false,resumeTimer=null;
  var io=null;
  if('IntersectionObserver' in window){
    io=new IntersectionObserver(function(entries){
      if(observerSuspended)return;
      var best=null;
      entries.forEach(function(en){
        if(en.isIntersecting&&(!best||en.intersectionRatio>best.intersectionRatio))best=en;
      });
      if(best){
        var match=targets.find(function(t){return t.el===best.target});
        if(match)setActive(match.link);
      }
    },{rootMargin:'-35% 0px -45% 0px',threshold:[0,0.25,0.5,0.75,1]});
    targets.forEach(function(t){io.observe(t.el);});
  }

  items.forEach(function(a){
    a.addEventListener('click',function(ev){
      ev.preventDefault();
      var el=document.getElementById(a.dataset.target);
      if(!el)return;
      setActive(a);/* فوري — لا ينتظر التمرير ولا الـ Observer */
      observerSuspended=true;
      if(resumeTimer)clearTimeout(resumeTimer);
      el.scrollIntoView({behavior:'smooth',block:'start'});
      /* يُستأنف رصد التمرير الحر بعد انتهاء حركة scrollIntoView السلسة تقريبًا */
      resumeTimer=setTimeout(function(){observerSuspended=false;},900);
    });
  });

  return {activateByTargetId:function(id){
    var match=targets.find(function(t){return t.el.id===id});
    if(match)setActive(match.link);
  }};
}
function enterFocus(){focusOn=true;if(EL.fdiv)EL.fdiv.classList.remove('hidden');try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();}catch(e){}}
function exitFocus(){focusOn=false;if(EL.fdiv)EL.fdiv.classList.add('hidden');try{document.exitFullscreen&&document.exitFullscreen();}catch(e){}}
/* v5.1: ربط اختصارات PWA (manifest.json shortcuts) وأي رابط عميق آخر بوجهته الصحيحة فعليًا.
   كانت هذه الروابط (?s=ksa، #azkar، #prayer) لا تُفعّل شيئًا لأن أي كود لم يكن يقرأها،
   وبعضها يشير أصلاً إلى IDs غير موجودة في الصفحة (#azkar/#prayer بدل azCard/prayerSection) —
   فلا يعمل حتى تمرير المتصفح التلقائي للـ hash. */
function handleDeepLinks(){
  try{
    var params=new URLSearchParams(location.search);
    var sId=params.get('s');
    if(sId){
      var st=STATIONS.find(function(x){return x.id===sId;});
      if(st)playStation(st);
    }
    var HASH_ALIASES={azkar:'azCard',prayer:'prayerSection',recite:'reciteCard',stations:'stationsCard',tasbih:'tbCard',tbcard:'tbCard'};
    var rawHash=(location.hash||'').replace('#','');
    if(rawHash){
      var targetId=document.getElementById(rawHash)?rawHash:HASH_ALIASES[rawHash];
      var targetEl=targetId?document.getElementById(targetId):null;
      if(targetEl){
        setTimeout(function(){
          targetEl.scrollIntoView({behavior:'smooth',block:'start'});
          if(bnavCtl&&bnavCtl.activateByTargetId)bnavCtl.activateByTargetId(targetId);
        },60);
      }
    }
  }catch(e){}
}
function shareApp(){
  var d={title:'القرآن الكريم مباشر',text:'استمع لإذاعات القرآن الكريم',url:location.href};
  if(navigator.share)navigator.share(d).catch(function(){});
  else if(navigator.clipboard)navigator.clipboard.writeText(d.url).then(function(){setStatus('ok','تم نسخ الرابط ✓');}).catch(function(){});
}
function setupMediaSession(){
  if(!('mediaSession' in navigator))return;
  navigator.mediaSession.setActionHandler('play',function(){if(!isPlaying)togglePlay();});
  navigator.mediaSession.setActionHandler('pause',function(){if(isPlaying)stop();});
  navigator.mediaSession.setActionHandler('stop',stop);
}
function updateMediaMeta(st){
  if(!('mediaSession' in navigator)||!st)return;
  navigator.mediaSession.metadata=new MediaMetadata({title:st.name,artist:st.cat==='رسمية'?'بث رسمي':'قارئ قرآن',album:'القرآن الكريم مباشر',artwork:[{src:'icon.svg',sizes:'192x192',type:'image/svg+xml'}]});
}
function checkOnline(){if(!navigator.onLine)setStatus('err','لا يوجد اتصال بالإنترنت',false);}

/* v5: دالة كتم موحّدة يستخدمها زر الكتم واختصار لوحة المفاتيح M معًا،
   بدل تكرار منطق جزئي في كل مكان (كان اختصار M لا يحفظ الحالة ولا يحدّث الشريط المرئي) */
function toggleMute(){
  muted=!muted;audio.muted=muted;
  if(EL.vslider)EL.vslider.style.setProperty('--val',muted?'0%':vol+'%');
  drawVol();ls('qr_muted',muted?'1':'0');
}

/* ═══════════════════════════════════════════
   BIND UI
═══════════════════════════════════════════ */
function bindUI(){
  if(EL.pbtn)EL.pbtn.addEventListener('click',togglePlay);
  if(EL.mbtn)EL.mbtn.addEventListener('click',togglePlay);
  if(EL.fpbtn)EL.fpbtn.addEventListener('click',togglePlay);
  if(EL.rbtn)EL.rbtn.addEventListener('click',manualRetry);
  if(EL.stSearch)EL.stSearch.addEventListener('input',function(e){stSearchQuery=e.target.value;renderStations();});
  if(!isIOS){
    if(EL.vslider)EL.vslider.addEventListener('input',function(e){setVol(parseInt(e.target.value,10));});
    if(EL.mutebtn)EL.mutebtn.addEventListener('click',toggleMute);
  }
  if(EL.thbtn)EL.thbtn.addEventListener('click',function(){applyTheme(theme==='dark'?'light':'dark',true);});
  if(EL.focusbtn)EL.focusbtn.addEventListener('click',enterFocus);
  if(EL.fexit)EL.fexit.addEventListener('click',exitFocus);
  if(EL.sharebtn)EL.sharebtn.addEventListener('click',shareApp);
  document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement&&focusOn)exitFocus();});

  /* Tasbih */
  if(EL.tbTap)EL.tbTap.addEventListener('click',incTasbeeh);
  var tbRingEl=g('tbRing');
  if(tbRingEl){
    tbRingEl.addEventListener('click',function(e){if(e.target.closest('#tbTap'))return;incTasbeeh();});
    tbRingEl.addEventListener('touchend',function(e){e.preventDefault();if(e.target.closest('#tbTap'))return;incTasbeeh();},{passive:false});
    if(EL.tbTap)EL.tbTap.addEventListener('touchend',function(e){e.preventDefault();incTasbeeh();},{passive:false});
  }
  if(EL.tbRst)EL.tbRst.addEventListener('click',rstTasbeeh);
  if(EL.tbTargetBtn)EL.tbTargetBtn.addEventListener('click',cycleTbTarget);

  /* Battery saver */
  var bsOn=lg('qr_bsaver')==='1';
  function applyBS(on){bsOn=on;document.body.classList.toggle('battery-saver',on);if(EL.batterybtn)EL.batterybtn.classList.toggle('bsaver-on',on);ls('qr_bsaver',on?'1':'0');}
  applyBS(bsOn);
  if(EL.batterybtn)EL.batterybtn.addEventListener('click',function(){applyBS(!bsOn);setStatus(bsOn?'warn':'ok',bsOn?'🔋 توفير الطاقة: مفعّل':'⚡ توفير الطاقة: متوقف');});

  /* Preload */
  function preload(){if(!preloaded){audio.load();preloaded=true;}}
  document.addEventListener('touchstart',preload,{once:true,passive:true});
  document.addEventListener('click',preload,{once:true});

  /* Keyboard */
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
    if(e.key==='Escape'&&focusOn)exitFocus();
    if(e.code==='Space'){e.preventDefault();togglePlay();}
    if(e.code==='KeyM'&&!isIOS){toggleMute();}
  });
}

/* bell state from ui.js */
document.addEventListener('DOMContentLoaded',function(){
  if(typeof PrayerUI!=='undefined'&&typeof LocationService!=='undefined'&&typeof PrayerService!=='undefined')PrayerUI.init();
});

/* واجهة صغيرة مُعرَّضة للتحكم المتبادل مع قسم التلاوات (منع تشغيل مصدرين معًا) */
window.QuranRadioAPI={stop:stop,isPlaying:function(){return isPlaying;}};

init();
})();
