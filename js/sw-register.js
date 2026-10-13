/* sw-register.js — v5.8: تسجيل الـService Worker وتنبيه التحديث، كانا سكربتًا مضمّنًا في index.html.
   نُقلا هنا حرفيًا (المنطق والتعليقات كما هي) كي تعمل سياسة CSP بـ script-src 'self' بلا 'unsafe-inline'.
   الفرق الوحيد: تنبيه التحديث يُبنى بـ createElement/textContent بدل innerHTML، وكل شيء داخل IIFE. */
(function(){
if('serviceWorker' in navigator){
  /* v5.6 (PageSpeed review #3 — deep root cause):
     التقارير كانت بتفشل بشكل متقطّع في قياس LCP/TBT (Error! NO_LCP) — مش بسبب حاجة
     في التلاوات ولا الموقع، لكن بسبب سباق زمني في هذا الكود نفسه: self.clients.claim()
     في activate بتاع الـService Worker (سطر مقصود ومطلوب لباقي السيناريوهات) بيُطلق
     حدث controllerchange حتى في *أول تفعيل على الإطلاق* — يعني أول زيارة للمستخدم،
     لمّا navigator.serviceWorker.controller كان null قبلها بلحظات وبقى Worker جديد
     فجأة. الكود القديم كان بيعتبر أي controllerchange = "تحديث حقيقي، أعِد التحميل"،
     فكان بيعمل reload() غير ضروري لكل زائر جديد تمامًا وسط تحميل الصفحة الأولى —
     وهو بالظبط اللي كان بيقطع قياس Lighthouse أحيانًا (حسب توقيت السباق بين تفعيل
     الـSW واكتمال قياس LCP)، وكان بيسبب نفس التجربة المزعجة لزائر حقيقي بيشوف
     صفحته بتعيد التحميل من غير أي سبب. الإصلاح المعياري (موصى به من web.dev/
     Workbox لنفس المشكلة تحديدًا): تسجيل هل كان فيه Controller *قبل* التسجيل أصلًا؛
     لو لأ (يعني ده أول تفعيل)، نتجاهل أول controllerchange ونعتبره خط الأساس بدل
     إعادة تحميل، وأي controllerchange بعد كده فعلاً تحديث حقيقي فيستأهل reload(). */
  var hadController = !!navigator.serviceWorker.controller;
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(function(reg){
      /* v5.4 PageSpeed review: reg.update() بيرجّع Promise منفصل عن سلسلة register()
         نفسها — لو فشل فحص التحديث (شبكة بطيئة، Throttling، إلخ) كان بيطلع كخطأ غير
         مُعالَج في الـconsole مباشرة (unhandled rejection)، وده بالظبط اللي رصدته
         PageSpeed Insights: "Failed to update a ServiceWorker... unknown error".
         الإصلاح: .catch() صامت هنا فقط — فشل فحص تحديث خلفي عابر مش خطأ حقيقي يستحق
         تسجيله، وأصلاً reg.update() نفسها استدعاء fire-and-forget من الأساس. */
      reg.update().catch(function(){});
      reg.addEventListener('updatefound',function(){
        var w=reg.installing;
        w.addEventListener('statechange',function(){
          if(w.state==='installed'&&navigator.serviceWorker.controller)showPWAUpdateToast(w);
        });
      });
    }).catch(function(){});
  });
  var refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(refreshing) return;
    if(!hadController){ hadController=true; return; } // أول تفعيل على الإطلاق — ليس تحديثًا
    refreshing=true;
    window.location.reload();
  });
}
function showPWAUpdateToast(worker){
  var old=document.getElementById('pwaUpdateToast');if(old)old.remove();
  var t=document.createElement('div');t.id='pwaUpdateToast';t.className='pwa-update-toast';
  var inner=document.createElement('div');inner.className='pwa-update-inner';
  var txt=document.createElement('span');txt.className='pwa-update-txt';txt.textContent='🆕 يتوفر إصدار جديد';
  var upd=document.createElement('button');upd.className='pwa-update-btn';upd.id='pwaUpdateBtn';upd.textContent='تحديث الآن';
  var cls=document.createElement('button');cls.className='pwa-update-close';cls.id='pwaUpdateClose';cls.setAttribute('aria-label','إغلاق');cls.textContent='✕';
  inner.appendChild(txt);inner.appendChild(upd);inner.appendChild(cls);t.appendChild(inner);
  document.body.appendChild(t);
  requestAnimationFrame(function(){requestAnimationFrame(function(){t.classList.add('show');});});
  upd.addEventListener('click',function(){worker.postMessage({type:'SKIP_WAITING'});t.classList.remove('show');});
  cls.addEventListener('click',function(){t.classList.remove('show');setTimeout(function(){t.remove();},400);});
}
})();
