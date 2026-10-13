/* safe-dom.js — v5.8: مساعدات صغيرة لبناء الواجهة دون حقن بيانات خارجية في innerHTML.
   h(): ينشئ عنصرًا (النصوص عبر textContent دائمًا). tpl(): يحلّل قالبًا ثابتًا فقط بـ DOMParser (لا تنفَّذ فيه
   سكربتات ولا معالجات)؛ والحقول المتغيّرة تُملأ بعده عبر fill() بـ textContent (مواضع data-f="اسم"). */
(function(){
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* h('div', {class:'x', id:'y', text:'نص', attrs:{'aria-label':'..'}, dataset:{id:'1'}}, [أبناء]) */
  function h(tag, props, kids){
    var el = document.createElement(tag);
    if (props) {
      if (props.class) el.className = props.class;
      if (props.id) el.id = props.id;
      if (props.type) el.type = props.type;
      if (props.text != null) el.textContent = props.text;
      if (props.attrs) Object.keys(props.attrs).forEach(function(k){ el.setAttribute(k, props.attrs[k]); });
      if (props.dataset) Object.keys(props.dataset).forEach(function(k){ el.dataset[k] = props.dataset[k]; });
    }
    if (kids) kids.forEach(function(k){ if (k) el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return el;
  }

  /* يحوّل قالب HTML ثابتًا إلى DocumentFragment — لا تمرّر إليه أي بيانات خارجية */
  function tpl(html){
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    var frag = document.createDocumentFragment();
    while (doc.body.firstChild) frag.appendChild(document.adoptNode(doc.body.firstChild));
    return frag;
  }

  /* يملأ كل عنصر data-f="اسم" بنص المفتاح المقابل (textContent)؛ ويُزيل علامة data-f بعد الملء */
  function fill(root, map){
    Object.keys(map).forEach(function(k){
      var nodes = root.querySelectorAll('[data-f="' + k + '"]');
      for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = map[k] == null ? '' : String(map[k]); nodes[i].removeAttribute('data-f'); }
    });
    return root;
  }

  /* v5.9.2: نسخة مخزَّنة للقوالب الثابتة المتكررة (أيقونات القوائم…): تُحلَّل مرة واحدة ثم تُستنسخ بـcloneNode.
     لا تُستخدم مع نصوص متغيّرة (الذاكرة تنمو بعدد النصوص المختلفة)؛ للمتغيّر استعمل tpl() ثم fill(). */
  var tplCache = Object.create(null);
  function tplc(html){
    var proto = tplCache[html];
    if (!proto) proto = tplCache[html] = tpl(html);
    return proto.cloneNode(true);
  }

  /* يستبدل محتوى حاوية بقالب ثابت (بديل آمن لـ el.innerHTML = قالب) */
  function setTpl(el, html, map){
    var frag = tpl(html);
    if (map) fill(frag, map);
    el.replaceChildren(frag);
    return el;
  }

  window.SafeDOM = { h: h, tpl: tpl, tplc: tplc, fill: fill, setTpl: setTpl, SVG_NS: SVG_NS };
})();
