/* Shared page for every subject. A subject's page (e.g. nai/index.html) holds only
     <script src="../core/boot.js" data-subject="nai"></script>
   This writes the page around it, then loads data/<subject>/subject.js, the data files it lists, and core/app.js.
   document.write keeps them in order and blocking, exactly like plain <script> tags in the page would. */
(function () {
  "use strict";
  var me = document.currentScript, id = me.getAttribute("data-subject") || "";
  if (!/^[a-z0-9-]{1,30}$/.test(id)) { document.write("<p>Chybí předmět (data-subject).</p>"); return; }
  var root = me.src.replace(/core\/boot\.js(\?.*)?$/, ""), dir = root + "data/" + id + "/";
  /* everything a subject keeps apart from the others: saved progress, rooms */
  window.SBIRKA = { id: id, root: root, dir: dir, key: "sbirka-" + id + "-v1" };

  /* the saved theme before first paint */
  try { var s = JSON.parse(localStorage.getItem(SBIRKA.key) || "null"); if (s && (s.theme === "light" || s.theme === "dark")) document.documentElement.setAttribute("data-theme", s.theme); } catch (e) {}

  window.MathJax = {
    tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]], displayMath: [["\\[", "\\]"], ["$$", "$$"]] },
    svg: { fontCache: "global" },
    options: { skipHtmlTags: ["script", "style", "textarea", "input", "button"] },
    startup: {
      typeset: false,
      ready: function () {
        MathJax.startup.defaultReady();
        MathJax.startup.promise.then(function () { if (window.__typeset) window.__typeset(); });
      }
    }
  };
  var mj = document.createElement("script");
  mj.src = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js"; mj.async = true;
  document.head.appendChild(mj);

  /* after subject.js: its data files, then the app */
  SBIRKA.load = function () {
    var S = window.SUBJECT || {};
    if (S.title) document.title = S.title;
    document.write((S.files || []).map(function (f) { return '<script src="' + dir + f + '"><\/script>'; }).join("") +
      '<script src="' + root + 'core/app.js"><\/script>');
  };

  document.write(
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">' +
    '<link rel="stylesheet" href="' + root + 'core/app.css">' +
    '<div class="app" id="app">' +
    '  <aside>' +
    '    <div class="side-top">' +
    '      <div class="brand">' +
    '        <a class="brandlink" href="' + root + '" title="Všechny předměty"><b id="brand"></b><span id="brandsub"></span></a>' +
    '        <div class="brand-btns">' +
    '          <button class="iconbtn" id="rtbtn" type="button" popovertarget="rtpop" title="Spolu: sdílet pohled, ukazatel a poznámky s dalšími počítači" aria-label="Spolu">⇄<b id="rtn"></b></button>' +
    '          <button class="iconbtn" id="theme" type="button" title="Přepnout světlý a tmavý vzhled" aria-label="Přepnout světlý a tmavý vzhled">◐</button>' +
    '        </div>' +
    '      </div>' +
    '      <div class="rtpop" id="rtpop" popover><div id="rtbody"></div></div>' +
    '      <nav class="navtabs" id="tabs" aria-label="Sekce"></nav>' +
    '      <div class="search"><input id="q" type="search" placeholder="Hledat: číslo, název, vzor…" aria-label="Hledat příklad" autocomplete="off"></div>' +
    '    </div>' +
    '    <ul class="list" id="list"></ul>' +
    '    <details class="side-foot" id="foot">' +
    '      <summary id="prog"></summary>' +
    '      <div class="foot-body">' +
    '        <button class="btn" type="button" data-sys="export">Exportovat postup</button>' +
    '        <button class="btn" type="button" data-sys="import">Importovat postup</button>' +
    '        <button class="btn danger" type="button" data-sys="reset">Smazat postup</button>' +
    '        <div id="confirm"></div>' +
    '        <p class="msg" id="msg" role="status" aria-live="polite"></p>' +
    '        <input type="file" id="file" accept="application/json,.json" class="sr" tabindex="-1" aria-hidden="true">' +
    '      </div>' +
    '    </details>' +
    '  </aside>' +
    '  <main id="main"></main>' +
    '</div>' +
    '<div class="drawer" id="drawer">' +
    '  <button class="dhandle" id="dhandle" type="button" aria-expanded="false" aria-controls="dpanel" aria-label="Vzorce a konstanty" title="Vzorce a konstanty — klikni pro otevření, táhni pro posun"><span aria-hidden="true">«</span></button>' +
    '  <section class="dpanel" id="dpanel" aria-label="Vzorce a konstanty">' +
    '    <div class="dhead fhead">Vzorce a konstanty<span class="dhint" id="dhint"></span></div>' +
    '    <div class="dbody" id="dbody" tabindex="0"></div>' +
    '    <div class="dgrip" id="dgrip" title="Táhni pro změnu výšky"></div>' +
    '  </section>' +
    '</div>' +
    '<div class="drawer pad" id="pad">' +
    '  <button class="dhandle" id="phandle" type="button" aria-expanded="false" aria-controls="ppanel" aria-label="Poznámky" title="Poznámky: psaní a kreslení — klikni pro otevření, táhni pro posun"><span aria-hidden="true">✎</span></button>' +
    '  <section class="dpanel" id="ppanel" aria-label="Poznámky">' +
    '    <div class="dhead phead"><span>Poznámky</span><span class="ink-bar ptools" id="ptools"></span></div>' +
    '    <div class="dbody padbody" id="pbody"><div class="pcanvas" id="pcanvas"><textarea id="ptext" spellcheck="false" wrap="off" aria-label="Poznámky: piš sem"></textarea><svg class="ink" id="pink" aria-hidden="true"><g id="pdone"></g></svg></div></div>' +
    '    <div class="dgrip" id="pgrip" title="Táhni pro změnu výšky"></div>' +
    '  </section>' +
    '</div>' +
    '<button class="rtchip" id="rtchip" type="button" popovertarget="rtpop" hidden></button>' +
    '<a class="report" id="report" href="https://github.com/machmar/sbirka/issues/new" target="_blank" rel="noopener" title="Otevře nové hlášení na GitHubu (je potřeba účet GitHub)">Nahlásit chybu</a>' +
    '<script src="' + dir + 'subject.js"><\/script><script>SBIRKA.load()<\/script>'
  );
})();
