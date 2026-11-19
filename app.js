/* ===== V6 app.js · Cuenta regresiva ===== */
(function () {
  "use strict";

  var FALLBACK = { events: [], generado_legible: "—" };
  var MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SETIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  var MESES_S = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SET","OCT","NOV","DIC"];
  var DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];

  var $ = function (id) { return document.getElementById(id); };
  var DATA = FALLBACK;
  var byDay = {};       // "YYYY-M-D" -> [eventos]
  var viewY = null, viewM = null;  // mes visible en el calendario
  var selKey = null;

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
  function pad(n) { return String(n).padStart(2, "0"); }
  function key(y, m, d) { return y + "-" + m + "-" + d; }

  /* ---------- reloj + countdown ---------- */
  function tickClock() {
    var n = new Date();
    $("clock").textContent = pad(n.getHours()) + ":" + pad(n.getMinutes()) + ":" + pad(n.getSeconds());
  }

  function nextEvent() {
    var now = Date.now();
    var best = null, bestT = Infinity;
    DATA.events.forEach(function (ev) {
      var d = fecha(ev.start);
      if (!d) return;
      var t = d.getTime();
      if (t > now - 36e5 && t < bestT) { bestT = t; best = ev; }
    });
    return best || DATA.events[0] || null;
  }

  function tickCount() {
    var ev = nextEvent();
    if (!ev) return;
    var d = fecha(ev.start);
    var diff = Math.max(0, d.getTime() - Date.now());
    var dd = Math.floor(diff / 864e5);
    var hh = Math.floor(diff % 864e5 / 36e5);
    var mm = Math.floor(diff % 36e5 / 6e4);
    var ss = Math.floor(diff % 6e4 / 1e3);
    $("cD").textContent = pad(dd);
    $("cH").textContent = pad(hh);
    $("cM").textContent = pad(mm);
    $("cS").textContent = pad(ss);
  }

  function hero() {
    var ev = nextEvent();
    if (!ev) return;
    var d = fecha(ev.start);
    $("heroName").textContent = ev.title;
    $("heroDate").textContent = d
      ? DIAS[d.getDay()] + " " + d.getDate() + " " + MESES_S[d.getMonth()] + " " + d.getFullYear() + " · " + pad(d.getHours()) + ":" + pad(d.getMinutes())
      : "Fecha por confirmar";
    $("heroTitle").textContent = ev.title;
    $("heroVenue").textContent = [ev.venue, ev.price].filter(Boolean).join(" · ");
    var p = $("heroPoster");
    if (ev.poster) { p.src = ev.poster; p.style.display = ""; } else p.style.display = "none";
    $("heroCard").onclick = function () { abrir(ev); };
  }

  /* ---------- calendario mensual ---------- */
  function indexDays() {
    byDay = {};
    DATA.events.forEach(function (ev) {
      var d = fecha(ev.start);
      if (!d) return;
      var k = key(d.getFullYear(), d.getMonth(), d.getDate());
      (byDay[k] = byDay[k] || []).push(ev);
    });
  }

  function renderCal() {
    var first = new Date(viewY, viewM, 1);
    // semana empieza domingo
    var startDay = first.getDay();
    $("calTitle").textContent = MESES[viewM] + " " + viewY;
    var today = new Date();
    var html = "";
    for (var i = 0; i < 42; i++) {
      var dt = new Date(viewY, viewM, 1 - startDay + i);
      var inM = dt.getMonth() === viewM;
      var k = key(dt.getFullYear(), dt.getMonth(), dt.getDate());
      var evs = byDay[k] || [];
      var cls = "day" + (inM ? "" : " dim") + (evs.length ? " has" : "") +
        (evs.length > 1 ? " multi" : "") +
        (k === selKey ? " sel" : "") +
        (dt.toDateString() === today.toDateString() ? " today" : "");
      html += '<button type="button" class="' + cls + '" data-k="' + k + '"' + (evs.length ? "" : " disabled") + ">" + dt.getDate() + "</button>";
    }
    var g = $("grid");
    g.classList.add("fade");
    setTimeout(function () {
      g.innerHTML = html;
      g.classList.remove("fade");
    }, 120);
  }

  /* ---------- agenda ---------- */
  function cuandoCorto(ev) {
    var d = fecha(ev.start);
    if (!d) return "—";
    var h = ev.start.length === 10 ? "" : " · " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    return DIAS[d.getDay()] + " " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + h;
  }

  function renderAgenda() {
    var groups = {};
    DATA.events.forEach(function (ev) {
      var d = fecha(ev.start);
      var gk = d ? MESES[d.getMonth()] + " " + d.getFullYear() : "SIN FECHA";
      (groups[gk] = groups[gk] || []).push(ev);
    });
    var ag = $("agenda");
    var html = "";
    Object.keys(groups).forEach(function (gk) {
      html += '<div class="mlabel">' + esc(gk) + "</div>";
      groups[gk].forEach(function (ev, i) {
        var d = fecha(ev.start);
        var past = ev.dias != null && ev.dias < 0;
        var soon = ev.dias != null && ev.dias >= 0 && ev.dias <= 7;
        html += '<button type="button" class="ev' + (past ? " past" : "") + '" data-slug="' + esc(ev.slug) + '" style="animation-delay:' + (i * 50) + 'ms">' +
          '<div class="ev-date"><div class="ev-num">' + (d ? pad(d.getDate()) : "—") + "</div>" +
          '<div class="ev-mon">' + (d ? DIAS[d.getDay()].toUpperCase() + " · " + MESES_S[d.getMonth()] : "") + "</div>" +
          (ev.countdown && !past ? '<div class="ev-cd' + (soon ? " soon" : "") + '">' + esc(ev.countdown) + "</div>" : "") + "</div>" +
          '<div class="ev-main"><h3 class="ev-title">' + esc(ev.title) + "</h3>" +
          '<p class="ev-sub">' + esc([ev.subtitle, ev.venue].filter(Boolean).join(" · ")) + "</p></div>" +
          (ev.poster ? '<img class="ev-thumb" src="' + esc(ev.poster) + '" alt="" loading="lazy">' : "") +
        "</button>";
      });
    });
    ag.innerHTML = html || '<div class="mlabel">Sin fechas</div>';
    ag.querySelectorAll(".ev").forEach(function (b) {
      b.addEventListener("click", function () {
        var ev = DATA.events.filter(function (e) { return e.slug === b.dataset.slug; })[0];
        if (ev) abrir(ev);
      });
    });
  }

  /* ---------- sheet ---------- */
  function abrir(ev) {
    var d = fecha(ev.start);
    var fin = fecha(ev.end);
    var h = ev.start && ev.start.length > 10 && d ? " · " + pad(d.getHours()) + ":" + pad(d.getMinutes()) : "";
    var c = d ? DIAS[d.getDay()] + " " + d.getDate() + " " + ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"][d.getMonth()] + " " + d.getFullYear() + h : "Fecha por confirmar";
    if (fin && d && fin.getDate() !== d.getDate()) c += " → " + fin.getDate();

    $("sheetPoster").style.display = ev.poster ? "" : "none";
    if (ev.poster) $("sheetPoster").src = ev.poster;
    $("sheetWhen").textContent = c + (ev.countdown ? " · " + ev.countdown : "");
    $("sheetTitle").textContent = ev.title;
    $("sheetSub").textContent = [ev.subtitle, ev.venue].filter(Boolean).join(" · ");

    var rows = [
      ["Lugar", "<strong>" + esc(ev.venue || "Por confirmar") + "</strong>" + (ev.address ? "<br>" + esc(ev.address) : "")],
      ["Precio", esc(ev.price || "Ver publicación")],
      (ev.lineup || []).length ? ["Lineup", '<div class="lineup">' + ev.lineup.map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") + "</div>"] : null,
      (ev.producers || []).length ? ["Produce", esc(ev.producers.join(" · "))] : null
    ].filter(Boolean);
    $("sheetRows").innerHTML = rows.map(function (r) {
      return '<div class="srow"><div class="srow-k">' + r[0] + '</div><div class="srow-v">' + r[1] + "</div></div>";
    }).join("");
    $("sheetNote").textContent = ev.note || "";
    $("sheetNote").style.display = ev.note ? "" : "none";

    var links = [];
    if (ev.tickets) links.push('<a class="slink pri" href="' + esc(ev.tickets) + '" target="_blank" rel="noopener"><span>Entradas</span><span>↗</span></a>');
    if (ev.ig_post) links.push('<a class="slink" href="' + esc(ev.ig_post) + '" target="_blank" rel="noopener"><span>Post en Instagram</span><span>↗</span></a>');
    if (ev.gcal_link) links.push('<a class="slink" href="' + esc(ev.gcal_link) + '" target="_blank" rel="noopener"><span>Google Calendar</span><span>↗</span></a>');
    $("sheetLinks").innerHTML = links.join("");

    var sh = $("sheet");
    sh.hidden = false;
    requestAnimationFrame(function () { sh.classList.add("open"); });
    document.body.style.overflow = "hidden";
  }

  function cerrar() {
    var sh = $("sheet");
    sh.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(function () { sh.hidden = true; }, 380);
  }

  /* ---------- init ---------- */
  function init(data) {
    DATA = data && data.events ? data : FALLBACK;
    DATA.events.forEach(function (e) { if (e.poster) e.poster = e.poster.replace(/^\.\.\//, ""); });
    $("stamp").textContent = DATA.generado_legible || "—";
    indexDays();

    var now = new Date();
    viewY = now.getFullYear(); viewM = now.getMonth();
    // si no hay eventos este mes, saltar al mes del próximo evento
    var ne = nextEvent();
    if (ne) {
      var nd = fecha(ne.start);
      if (nd && (nd.getFullYear() !== viewY || nd.getMonth() !== viewM)) {
        var hasThisMonth = DATA.events.some(function (e) {
          var x = fecha(e.start);
          return x && x.getFullYear() === viewY && x.getMonth() === viewM;
        });
        if (!hasThisMonth) { viewY = nd.getFullYear(); viewM = nd.getMonth(); }
      }
    }

    hero();
    renderCal();
    renderAgenda();
    tickClock(); tickCount();
    setInterval(tickClock, 1000);
    setInterval(tickCount, 1000);

    $("calPrev").addEventListener("click", function () {
      viewM--; if (viewM < 0) { viewM = 11; viewY--; } renderCal();
    });
    $("calNext").addEventListener("click", function () {
      viewM++; if (viewM > 11) { viewM = 0; viewY++; } renderCal();
    });
    $("grid").addEventListener("click", function (e) {
      var b = e.target.closest(".day.has");
      if (!b) return;
      selKey = b.dataset.k;
      renderCal();
      var evs = byDay[selKey] || [];
      if (evs.length === 1) abrir(evs[0]);
      else if (evs.length > 1) {
        // varios el mismo día: ir al primero y avisar cuántos hay
        abrir(evs[0]);
      }
    });

    $("sheetBg").addEventListener("click", cerrar);
    $("sheetX").addEventListener("click", cerrar);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });
    var y0 = null;
    $("sheetCard").addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    $("sheetCard").addEventListener("touchend", function (e) {
      if (y0 == null) return;
      if (e.changedTouches[0].clientY - y0 > 110 && $("sheetCard").scrollTop <= 0) cerrar();
      y0 = null;
    }, { passive: true });
  }

  if (window.__EVENTS__) init(window.__EVENTS__);
  else fetch("data/events.js").then(function (r) { return r.json(); }).then(init).catch(function () { init(FALLBACK); });
})();
