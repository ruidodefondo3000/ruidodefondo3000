/* ===== V3 app.js · Agenda Sonora ===== */
(function () {
  "use strict";

  var FALLBACK = { handle: "ruido.de.fondo.3000", events: [], generado_legible: "—" };
  var MESES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SET","OCT","NOV","DIC"];
  var MESES_LARGO = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
  var DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];

  var $ = function (id) { return document.getElementById(id); };
  var DATA = FALLBACK;
  var filtro = "all";
  var actual = null;
  var soundOn = false;

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
  function tone(ev) {
    var S = window.Sound;
    return S ? S.getProfile(ev).color : "#a78bfa";
  }
  function soundName(ev) {
    var S = window.Sound;
    return S ? S.getProfile(ev).name : "EN VIVO";
  }
  function price(ev) {
    if (ev.free) return "GRATIS";
    if (!ev.price) return "VER POST";
    return ev.price.length > 26 ? ev.price.split("·")[0].trim() + " +" : ev.price;
  }
  function pasa(ev) {
    if (filtro === "next") return (ev.dias != null ? ev.dias >= 0 : true) && DATA.events.indexOf(ev) < 3;
    if (filtro === "free") return !!ev.free;
    if (filtro === "intl") return (ev.tags || []).some(function (t) { return /internacional/i.test(t); });
    return true;
  }

  /* ---------- rail ---------- */
  function railHTML() {
    var ops = [
      ["all", "TODO"], ["next", "PRÓXIMOS"], ["free", "GRATIS"], ["intl", "INTERNACIONAL"]
    ];
    return ops.map(function (o) {
      return '<button class="rbtn' + (filtro === o[0] ? " on" : "") + '" data-f="' + o[0] + '"><span class="dot"></span>' + o[1] + "</button>";
    }).join("");
  }

  /* ---------- tarjetas ---------- */
  function renderDeck() {
    var list = DATA.events.filter(pasa);
    var deck = $("deck");
    if (!list.length) { deck.innerHTML = '<div class="empty">Nada por acá todavía</div>'; return; }

    deck.innerHTML = list.map(function (ev, i) {
      var d = fecha(ev.start);
      var col = tone(ev);
      var tags = []
        .concat(ev.free ? [["GRATIS", true]] : [])
        .concat((ev.genres || []).slice(0, 2).map(function (g) { return [g, false]; }))
        .concat((ev.tags || []).slice(0, 1).map(function (t) { return [t, false]; }));

      return '<article class="tile" data-i="' + i + '" style="--tone:' + col + ';animation-delay:' + (i * 60) + 'ms">' +
        '<div class="tile-head">' +
          '<div class="tile-main">' +
          (ev.poster ? '<img class="tile-poster" src="' + esc(ev.poster) + '" alt="">' : '') +
          '<div class="tile-text"><h2 class="tile-title">' + esc(ev.title) + "</h2>" +
          (ev.subtitle ? '<p class="tile-sub">' + esc(ev.subtitle) + "</p>" : "") + "</div></div>" +
          '<div class="tile-date"><div class="td-num">' + (d ? String(d.getDate()).padStart(2, "0") : "—") + "</div>" +
          '<div class="td-mon">' + (d ? MESES[d.getMonth()] : "") + "</div>" +
          '<div class="td-cd">' + esc(ev.countdown || "") + "</div></div>" +
        "</div>" +
        '<div class="tile-tags">' + tags.map(function (t) {
          return '<span class="' + (t[1] ? "key" : "") + '">' + esc(t[0]) + "</span>";
        }).join("") + "</div>" +
        '<div class="tile-foot">' +
          '<span>' + esc(ev.venue || "por confirmar") + " · " + esc(price(ev)) + "</span>" +
          '<span class="tile-wave"><i></i><i></i><i></i><i></i><i></i></span>' +
          '<span class="tile-play"><b>▶</b> ' + esc(soundName(ev)) + "</span>" +
        "</div>" +
      "</article>";
    }).join("");

    deck.querySelectorAll(".tile").forEach(function (t) {
      t.addEventListener("click", function () {
        abrir(list[Number(t.dataset.i)]);
      });
    });
  }

  /* ---------- stage ---------- */
  function abrir(ev) {
    actual = ev;
    var col = tone(ev);
    var d = fecha(ev.start);
    var fin = fecha(ev.end);
    var cuando = "Fecha por confirmar";
    if (d) {
      var h = hora(ev.start);
      cuando = DIAS[d.getDay()] + " " + d.getDate() + " " + MESES_LARGO[d.getMonth()] + " " + d.getFullYear() + (h ? " · " + h : "");
      if (fin && fin.getDate() !== d.getDate()) cuando += " → " + fin.getDate() + " " + MESES_LARGO[fin.getMonth()];
    }

    $("stage").style.setProperty("--tone", col);
    var hero = document.querySelector(".stage-hero");
    var oldImg = hero.querySelector(".stage-poster");
    if (oldImg) oldImg.remove();
    if (ev.poster) {
      var img = document.createElement("img");
      img.className = "stage-poster";
      img.src = ev.poster;
      img.alt = "";
      hero.insertBefore(img, hero.firstChild);
    }
    $("stageCd").textContent = ev.countdown + " · " + soundName(ev);
    $("stageTitle").textContent = ev.title;
    $("stageSub").textContent = [ev.subtitle, ev.venue].filter(Boolean).join(" · ");

    var chips = [];
    if (ev.free) chips.push(["GRATIS", true]);
    (ev.genres || []).forEach(function (g) { chips.push([g, false]); });
    (ev.tags || []).forEach(function (t) { chips.push([t, false]); });
    $("stageBody").innerHTML =
      '<div class="stage-chips">' + chips.map(function (c) {
        return '<span class="' + (c[1] ? "hi" : "") + '">' + esc(c[0]) + "</span>";
      }).join("") + "</div>" +
      fila("Cuándo", "<strong>" + esc(cuando) + "</strong>") +
      fila("Dónde", "<strong>" + esc(ev.venue || "por confirmar") + "</strong>" + (ev.address ? "<br>" + esc(ev.address) : "")) +
      fila("Precio", esc(ev.price || "Ver publicación")) +
      ((ev.lineup || []).length ? fila("Lineup", '<div class="lineup">' + ev.lineup.map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") + "</div>") : "") +
      ((ev.producers || []).length ? fila("Produce", esc(ev.producers.join(" · "))) : "") +
      (ev.note ? '<p class="snote">' + esc(ev.note) + "</p>" : "") +
      '<div class="sactions">' + acciones(ev) + "</div>";

    var ov = $("overlay");
    ov.hidden = false;
    requestAnimationFrame(function () { ov.classList.add("open"); });
    document.body.style.overflow = "hidden";

    // primer tap habilita el audio (gesto del usuario) y suena el evento
    if (window.Sound && !soundOn) {
      soundOn = true;
      window.Sound.enable();
      syncToggle();
    }
    tocar(ev);
    actualizarBotonPlay();
  }

  function fila(k, v) {
    return '<div class="srow"><div class="srow-k">' + k + '</div><div class="srow-v">' + v + "</div></div>";
  }

  function acciones(ev) {
    var a = [];
    if (ev.tickets) a.push('<a class="sbtn pri" href="' + esc(ev.tickets) + '" target="_blank" rel="noopener"><span>Entradas</span><span>↗</span></a>');
    if (ev.ig_post) a.push('<a class="sbtn" href="' + esc(ev.ig_post) + '" target="_blank" rel="noopener"><span>Post en Instagram</span><span>↗</span></a>');
    if (ev.gcal_link) a.push('<a class="sbtn" href="' + esc(ev.gcal_link) + '" target="_blank" rel="noopener"><span>Google Calendar</span><span>↗</span></a>');
    return a.join("") || '<div class="sbtn"><span>Sin links por ahora</span><span>—</span></div>';
  }

  function cerrar() {
    var ov = $("overlay");
    ov.classList.remove("open");
    document.body.style.overflow = "";
    if (window.Sound) window.Sound.stop();
    setTimeout(function () { ov.hidden = true; }, 430);
    resaltar(null);
    actual = null;
  }

  /* ---------- sonido ---------- */
  function syncToggle() {
    $("soundToggle").classList.toggle("on", soundOn);
    $("soundToggle").setAttribute("aria-pressed", String(soundOn));
    $("soundToggle").querySelector(".sound-label").textContent = soundOn ? "SONIDO ON" : "SONIDO OFF";
  }

  function toggleSonido() {
    var S = window.Sound;
    if (!S) return;
    soundOn = !soundOn;
    if (soundOn) {
      S.enable();
      if (actual) tocar(actual);
    } else {
      S.stop();
      S.disable();
      resaltar(null);
    }
    syncToggle();
    actualizarBotonPlay();
  }

  function tocar(ev) {
    var S = window.Sound;
    if (!S || !soundOn) return;
    S.play(ev);
    resaltar(ev);
    actualizarBotonPlay();
  }

  function resaltar(ev) {
    $("deck").querySelectorAll(".tile").forEach(function (t) {
      var tileEv = DATA.events.filter(pasa)[Number(t.dataset.i)];
      t.classList.toggle("sounding", !!ev && tileEv === ev);
    });
  }

  function actualizarBotonPlay() {
    var S = window.Sound;
    var playing = S && S.isPlaying();
    $("stagePlay").querySelector(".play-ico").textContent = playing ? "❚❚" : "▶";
    $("playTxt").textContent = playing ? "DETENER" : "ESCUCHAR";
  }

  /* ---------- visualizadores ---------- */
  function dibujar(canvas, color) {
    if (!canvas || !window.Sound) return;
    var ctx2 = canvas.getContext("2d");
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.floor(rect.width * dpr));
    var h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx2.clearRect(0, 0, w, h);

    var spec = window.Sound.spectrum();
    var bars = 42;
    var step = Math.max(1, Math.floor(w / (bars * dpr)));
    for (var i = 0; i < bars; i++) {
      var v = spec ? (spec[Math.floor(i * spec.length / bars)] || 0) : 0;
      // si no hay audio, onda ambiental suave para que igual se vea "vivo"
      var idle = 0.05 + 0.045 * (1 + Math.sin(Date.now() / 700 + i * 0.5));
      v = Math.max(v, idle * (spec ? 0.35 : 1));
      var bh = Math.max(2 * dpr, v * h * 0.88);
      var x = i * step * dpr;
      var grad = ctx2.createLinearGradient(0, h, 0, h - bh);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "rgba(255,255,255,.85)");
      ctx2.fillStyle = grad;
      ctx2.globalAlpha = .35 + v * .6;
      ctx2.fillRect(x, h - bh, Math.max(1, step * dpr - 2 * dpr), bh);
    }
    ctx2.globalAlpha = 1;
  }

  function loop() {
    var S = window.Sound;
    var col = S && S.isPlaying() ? S.color() : "#a78bfa";
    dibujar($("viz"), col);
    if (!$("overlay").hidden) dibujar($("stageViz"), col);
    requestAnimationFrame(loop);
  }

  /* ---------- init ---------- */
  function init(data) {
    DATA = data && data.events ? data : FALLBACK;
    DATA.events.forEach(function (e) { if (e.poster) e.poster = e.poster.replace(/^\.\.\//, "../../"); });
    $("totalEvents").textContent = String(DATA.events.length).padStart(2, "0");
    $("stamp").textContent = DATA.generado_legible || "—";
    $("rail").innerHTML = railHTML();
    renderDeck();

    $("rail").addEventListener("click", function (e) {
      var b = e.target.closest(".rbtn");
      if (!b) return;
      $("rail").querySelectorAll(".rbtn").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      filtro = b.dataset.f;
      renderDeck();
    });

    $("soundToggle").addEventListener("click", toggleSonido);
    $("stagePlay").addEventListener("click", function () {
      if (!soundOn) {
        soundOn = true;
        window.Sound.enable();
        syncToggle();
      }
      if (window.Sound && window.Sound.isPlaying()) { window.Sound.stop(); resaltar(null); }
      else if (actual) tocar(actual);
      actualizarBotonPlay();
    });
    $("stageClose").addEventListener("click", cerrar);
    $("veil").addEventListener("click", cerrar);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });

    var y0 = null;
    $("stage").addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    $("stage").addEventListener("touchend", function (e) {
      if (y0 == null) return;
      if (e.changedTouches[0].clientY - y0 > 120 && $("stage").scrollTop <= 0) cerrar();
      y0 = null;
    }, { passive: true });

    loop();
  }

  if (window.__EVENTS__) init(window.__EVENTS__);
  else fetch("../../data/events.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(init).catch(function () { init(FALLBACK); });
})();
