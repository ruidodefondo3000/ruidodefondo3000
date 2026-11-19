/* ===== V5 app.js · Historias ===== */
(function () {
  "use strict";

  var FALLBACK = { events: [], generado_legible: "—" };
  var MESES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SET","OCT","NOV","DIC"];
  var DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];
  var DUR = 7000; // ms por historia

  var $ = function (id) { return document.getElementById(id); };
  var DATA = FALLBACK;
  var idx = 0;
  var timer = null;
  var paused = false;
  var tStart = 0;
  var tLeft = DUR;

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
  function price(ev) {
    if (ev.free) return "GRATIS";
    return ev.price || "Ver post";
  }

  /* ---------- progreso ---------- */
  function renderProgress() {
    var p = $("progress");
    p.innerHTML = DATA.events.map(function (_, i) {
      var cls = i < idx ? "done" : (i === idx ? "live" : "");
      return '<i class="' + cls + '"' + (i === idx ? ' style="--dur:' + (tLeft / 1000) + 's"' : "") + "></i>";
    }).join("");
  }

  function armTimer(ms) {
    clearTimeout(timer);
    tLeft = ms;
    tStart = Date.now();
    renderProgress();
    // reinicia la animación de la barra viva
    var live = document.querySelector(".progress i.live");
    if (live) {
      live.style.animation = "none";
      void live.offsetWidth;
      live.style.animation = "";
    }
    timer = setTimeout(function () { go(idx + 1); }, ms);
  }

  function pause() {
    if (paused || !$("sheet").hidden) return;
    paused = true;
    clearTimeout(timer);
    tLeft = Math.max(300, tLeft - (Date.now() - tStart));
    var live = document.querySelector(".progress i.live");
    if (live) live.style.animationPlayState = "paused";
    $("muteBtn").textContent = "▶";
    $("muteBtn").setAttribute("aria-pressed", "true");
  }

  function resume() {
    if (!paused) return;
    paused = false;
    var live = document.querySelector(".progress i.live");
    if (live) live.style.animationPlayState = "running";
    $("muteBtn").textContent = "❚❚";
    $("muteBtn").setAttribute("aria-pressed", "false");
    armTimer(tLeft);
  }

  /* ---------- historia ---------- */
  function go(i) {
    if (!DATA.events.length) return;
    idx = (i + DATA.events.length) % DATA.events.length;
    var ev = DATA.events[idx];
    var d = fecha(ev.start);
    var h = hora(ev.start);

    // fondo con crossfade: blur de relleno + afiche nítido centrado
    var bg = $("bg");
    var main = $("bgMain");
    bg.classList.add("swap");
    main.classList.add("swap");
    setTimeout(function () {
      bg.style.backgroundImage = ev.poster ? 'url("' + ev.poster + '")' : "none";
      bg.style.backgroundColor = ev.poster ? "#000" : "#1a1a20";
      if (ev.poster) { main.src = ev.poster; main.alt = "Afiche de " + ev.title; main.style.display = ""; }
      else main.style.display = "none";
      bg.classList.remove("swap");
      main.classList.remove("swap");
    }, 180);

    var cd = ev.countdown || "";
    $("sKicker").textContent = (d ? DIAS[d.getDay()] + " " + d.getDate() + " " + MESES[d.getMonth()] + (h ? " · " + h : "") : "FECHA POR CONFIRMAR") + (cd ? "  ·  " + cd : "");
    $("sTitle").textContent = ev.title;
    $("sSub").textContent = [ev.subtitle, ev.venue].filter(Boolean).join(" · ");

    var chips = [];
    if (ev.free) chips.push(["GRATIS", true]);
    (ev.genres || []).slice(0, 2).forEach(function (g) { chips.push([g, false]); });
    (ev.tags || []).slice(0, 1).forEach(function (t) { chips.push([t, false]); });
    $("sChips").innerHTML = chips.map(function (c) {
      return '<span class="' + (c[1] ? "hot" : "") + '">' + esc(c[0]) + "</span>";
    }).join("");

    $("sWhen").textContent = (d ? DIAS[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1) : "—") + (h ? " · " + h : "");
    $("sWhere").textContent = ev.venue || "Por confirmar";
    $("sPrice").textContent = price(ev);

    var st = $("story");
    st.classList.remove("swap-in");
    void st.offsetWidth;
    st.classList.add("swap-in");

    paused = false;
    $("muteBtn").textContent = "❚❚";
    armTimer(DUR);
  }

  /* ---------- sheet ---------- */
  function abrirSheet() {
    pause();
    var ev = DATA.events[idx];
    if (!ev) return;
    $("shTitle").textContent = ev.title;
    $("shLineup").innerHTML = (ev.lineup || []).map(function (a) {
      return "<span>" + esc(a) + "</span>";
    }).join("");
    $("shNote").textContent = ev.note || "";
    $("shNote").style.display = ev.note ? "" : "none";
    var links = [];
    if (ev.tickets) links.push('<a class="slink pri" href="' + esc(ev.tickets) + '" target="_blank" rel="noopener"><span>Entradas</span><span>↗</span></a>');
    if (ev.ig_post) links.push('<a class="slink" href="' + esc(ev.ig_post) + '" target="_blank" rel="noopener"><span>Post en Instagram</span><span>↗</span></a>');
    if (ev.gcal_link) links.push('<a class="slink" href="' + esc(ev.gcal_link) + '" target="_blank" rel="noopener"><span>Google Calendar</span><span>↗</span></a>');
    $("shLinks").innerHTML = links.join("") || '<div class="slink"><span>Sin links por ahora</span><span>—</span></div>';

    var sh = $("sheet");
    sh.hidden = false;
    requestAnimationFrame(function () { sh.classList.add("open"); });
  }

  function cerrarSheet() {
    var sh = $("sheet");
    sh.classList.remove("open");
    setTimeout(function () { sh.hidden = true; resume(); }, 300);
  }

  /* ---------- init ---------- */
  function init(data) {
    DATA = data && data.events ? data : FALLBACK;
    DATA.events.forEach(function (e) { if (e.poster) e.poster = e.poster.replace(/^\.\.\//, "../../"); });
    $("stamp").textContent = DATA.generado_legible || "—";
    if (!DATA.events.length) {
      $("story").innerHTML = '<div class="empty-story">Sin fechas todavía</div>';
      return;
    }

    $("tapLeft").addEventListener("click", function () { go(idx - 1); });
    $("tapRight").addEventListener("click", function () { go(idx + 1); });
    $("muteBtn").addEventListener("click", function () { paused ? resume() : pause(); });
    $("ctaBtn").addEventListener("click", abrirSheet);
    $("sheetBg").addEventListener("click", cerrarSheet);
    $("sheetX").addEventListener("click", cerrarSheet);
    document.addEventListener("keydown", function (e) {
      if (!$("sheet").hidden && e.key === "Escape") cerrarSheet();
      else if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
    });

    // press & hold pausa (como en stories reales)
    var hold = null;
    $("stage").addEventListener("touchstart", function (e) {
      if (!$("sheet").hidden) return;
      if (e.target.closest("button, a")) return;
      hold = setTimeout(pause, 250);
    }, { passive: true });
    ["touchend", "touchcancel"].forEach(function (evn) {
      $("stage").addEventListener(evn, function () {
        clearTimeout(hold);
        if (paused && $("sheet").hidden) resume();
      }, { passive: true });
    });

    // swipe: horizontal = pasar historia, vertical up = detalles
    var gx0 = null, gy0 = null;
    $("stage").addEventListener("touchstart", function (e) {
      gx0 = e.touches[0].clientX; gy0 = e.touches[0].clientY;
    }, { passive: true });
    $("stage").addEventListener("touchend", function (e) {
      if (gx0 == null || gy0 == null || !$("sheet").hidden) { gx0 = gy0 = null; return; }
      var dx = e.changedTouches[0].clientX - gx0;
      var dy = e.changedTouches[0].clientY - gy0;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        go(idx + (dx < 0 ? 1 : -1));
      } else if (gy0 - e.changedTouches[0].clientY > 70) {
        abrirSheet();
      }
      gx0 = gy0 = null;
    }, { passive: true });
    // swipe down en el sheet lo cierra
    var sy0 = null;
    $("sheetCard").addEventListener("touchstart", function (e) { sy0 = e.touches[0].clientY; }, { passive: true });
    $("sheetCard").addEventListener("touchend", function (e) {
      if (sy0 == null) return;
      if (e.changedTouches[0].clientY - sy0 > 110 && $("sheetCard").scrollTop <= 0) cerrarSheet();
      sy0 = null;
    }, { passive: true });

    go(0);
  }

  if (window.__EVENTS__) init(window.__EVENTS__);
  else fetch("../../data/events.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(init).catch(function () { init(FALLBACK); });
})();
