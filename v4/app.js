/* ===== V4 app.js · Muro de afiches ===== */
(function () {
  "use strict";

  var FALLBACK = { handle: "ruido.de.fondo.3000", events: [], generado_legible: "—" };
  var MESES_LARGO = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
  var DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];

  var $ = function (id) { return document.getElementById(id); };
  var DATA = FALLBACK;
  var filtro = "all";
  var lista = [];
  var idx = 0;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fecha(iso) {
    if (!iso) return null;
    var d = new Date(iso.length === 10 ? iso + "T12:00:00-05:00" : iso);
    return isNaN(d) ? null : d;
  }
  function hora(iso) {
    if (!iso || iso.length === 10) return "";
    var d = fecha(iso);
    return d ? String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") : "";
  }
  function cuando(ev) {
    var d = fecha(ev.start);
    if (!d) return "FECHA POR CONFIRMAR";
    var h = hora(ev.start);
    return DIAS[d.getDay()] + " " + d.getDate() + " " + MESES_LARGO[d.getMonth()] + (h ? " · " + h : "");
  }
  function pasa(ev) {
    if (filtro === "free") return !!ev.free;
    if (filtro === "intl") return (ev.tags || []).some(function (t) { return /internacional/i.test(t); });
    return true;
  }

  function renderCuts() {
    var ops = [["all", "TODO"], ["free", "GRATIS"], ["intl", "INTERNACIONAL"]];
    $("cuts").innerHTML = ops.map(function (o) {
      return '<button type="button" class="cut' + (filtro === o[0] ? " on" : "") + '" data-f="' + o[0] + '">' + o[1] + "</button>";
    }).join("");
  }

  function renderWall() {
    lista = DATA.events.filter(pasa);
    var wall = $("wall");
    if (!lista.length) { wall.innerHTML = '<div class="empty">Nada por acá todavía</div>'; return; }
    wall.innerHTML = lista.map(function (ev, i) {
      var img = ev.poster
        ? '<img src="' + esc(ev.poster) + '" alt="Afiche de ' + esc(ev.title) + '" loading="lazy">'
        : '<div class="flyer-fallback"><b>' + esc(ev.title) + "</b><span>" + esc(ev.subtitle || "") + "</span></div>";
      return '<article class="flyer" data-i="' + i + '" style="animation-delay:' + (i * 60) + 'ms">' +
        '<div class="flyer-imgwrap">' + img +
        (ev.countdown ? '<span class="flyer-stamp">' + esc(ev.countdown) + "</span>" : "") +
        (ev.free ? '<span class="flyer-free">Gratis</span>' : "") +
        "</div>" +
        '<div class="flyer-body">' +
          '<div class="flyer-date">' + esc(cuando(ev)) + "</div>" +
          '<h2 class="flyer-title">' + esc(ev.title) + "</h2>" +
          (ev.subtitle ? '<p class="flyer-sub">' + esc(ev.subtitle) + " · " + esc(ev.venue || "") + "</p>" : "") +
          '<div class="flyer-foot"><span>' + esc(ev.price || "Ver post") + "</span>" +
          '<span class="flyer-open">VER AFICHE →</span></div>' +
        "</div></article>";
    }).join("");

    wall.querySelectorAll(".flyer").forEach(function (f) {
      f.addEventListener("click", function () { mostrar(Number(f.dataset.i)); });
    });
  }

  function mostrar(i) {
    if (!lista.length) return;
    idx = (i + lista.length) % lista.length;
    var ev = lista[idx];
    var img = $("viewerImg");
    img.removeAttribute("src");
    img.alt = "Afiche de " + ev.title;
    if (ev.poster) img.src = ev.poster;
    $("viewerTitle").textContent = ev.title;
    $("viewerMeta").textContent = [cuando(ev), ev.venue, ev.price].filter(Boolean).join(" · ");

    var links = [];
    if (ev.tickets) links.push('<a class="vlink pri" href="' + esc(ev.tickets) + '" target="_blank" rel="noopener">Entradas ↗</a>');
    if (ev.ig_post) links.push('<a class="vlink" href="' + esc(ev.ig_post) + '" target="_blank" rel="noopener">Post IG ↗</a>');
    if (ev.gcal_link) links.push('<a class="vlink" href="' + esc(ev.gcal_link) + '" target="_blank" rel="noopener">Calendar ↗</a>');
    $("viewerLinks").innerHTML = links.join("");

    var v = $("viewer");
    if (v.hidden) {
      v.hidden = false;
      requestAnimationFrame(function () { v.classList.add("open"); });
      document.body.style.overflow = "hidden";
    }
  }

  function cerrar() {
    var v = $("viewer");
    v.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(function () { v.hidden = true; }, 280);
  }

  function init(data) {
    DATA = data && data.events ? data : FALLBACK;
    $("totalEvents").textContent = String(DATA.events.length).padStart(2, "0");
    $("stamp").textContent = DATA.generado_legible || "—";
    renderCuts();
    renderWall();

    $("cuts").addEventListener("click", function (e) {
      var b = e.target.closest(".cut");
      if (!b) return;
      $("cuts").querySelectorAll(".cut").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      filtro = b.dataset.f;
      renderWall();
    });

    $("viewerX").addEventListener("click", cerrar);
    $("viewerBg").addEventListener("click", cerrar);
    $("viewerPrev").addEventListener("click", function () { mostrar(idx - 1); });
    $("viewerNext").addEventListener("click", function () { mostrar(idx + 1); });
    document.addEventListener("keydown", function (e) {
      if ($("viewer").hidden) return;
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowLeft") mostrar(idx - 1);
      if (e.key === "ArrowRight") mostrar(idx + 1);
    });

    // swipe horizontal para pasar de afiche / vertical para cerrar
    var x0 = null, y0 = null;
    var frame = $("viewerFrame");
    frame.addEventListener("touchstart", function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    frame.addEventListener("touchend", function (e) {
      if (x0 == null || y0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) mostrar(idx + (dx < 0 ? 1 : -1));
      else if (dy > 110) cerrar();
      x0 = y0 = null;
    }, { passive: true });
  }

  if (window.__EVENTS__) init(window.__EVENTS__);
  else fetch("../data/events.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(init).catch(function () { init(FALLBACK); });
})();
