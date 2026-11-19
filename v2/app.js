/* ===== V2 app.js · radar de fechas ===== */
(function () {
  const FALLBACK = { handle: "ruido.de.fondo.3000", events: [], generado_legible: "—" };
  const MESES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SET","OCT","NOV","DIC"];
  const MESES_LARGO = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
  const DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];

  const $ = (id) => document.getElementById(id);
  let DATA = FALLBACK;
  let mesActivo = "all";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fecha = (iso) => {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? iso + "T12:00:00-05:00" : iso);
    return isNaN(d) ? null : d;
  };

  function precioTxt(ev) {
    if (ev.free) return "GRATIS";
    if (ev.price) return ev.price.length > 24 ? ev.price.split("·")[0].trim() + " +" : ev.price;
    return "VER POST";
  }
  function horaTxt(ev) {
    if (!ev.start || ev.start.length === 10) return "";
    const d = fecha(ev.start);
    return d ? String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") : "";
  }

  function chipsHTML(ev, max) {
    const c = [];
    if (ev.free) c.push('<span class="chip-mini acc">GRATIS</span>');
    (ev.genres || []).forEach((g) => c.push(`<span class="chip-mini">${esc(g)}</span>`));
    (ev.tags || []).forEach((t) => c.push(`<span class="chip-mini">${esc(t)}</span>`));
    return c.slice(0, max || 3).join("");
  }

  /* ---------- featured ---------- */
  function renderFeat() {
    const ev = DATA.events[0];
    if (!ev) return;
    const d = fecha(ev.start);
    $("fdNum").textContent = d ? String(d.getDate()).padStart(2, "0") : "—";
    $("fdMon").textContent = d ? MESES[d.getMonth()] : "";
    $("fdTitle").textContent = ev.title;
    $("fdSub").textContent = [ev.subtitle, ev.venue].filter(Boolean).join(" · ");
    $("fdChips").innerHTML = chipsHTML(ev, 3) + `<span class="chip-mini">${esc(ev.countdown || "")}</span>`;
    $("feat").onclick = (e) => { e.preventDefault(); abrir(ev); };
  }

  function renderBars() {
    const bars = $("radarBars");
    const n = Math.min(DATA.events.length + 6, 26);
    let html = "";
    for (let i = 0; i < n; i++) {
      const h = 12 + Math.abs(Math.sin(i * 0.9)) * 78;
      html += `<i style="height:${h.toFixed(0)}%"></i>`;
    }
    bars.innerHTML = html;
  }

  /* ---------- meses ---------- */
  function renderMeses() {
    const clave = new Set();
    DATA.events.forEach((ev) => {
      const d = fecha(ev.start);
      if (d) clave.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    const arr = [...clave].sort();
    const html = ['<button class="mbtn on" data-m="all">Todos</button>']
      .concat(arr.map((k) => {
        const [y, m] = k.split("-").map(Number);
        return `<button class="mbtn" data-m="${k}">${MESES[m]} ${String(y).slice(2)}</button>`;
      })).join("");
    $("months").innerHTML = html;
    $("months").addEventListener("click", (e) => {
      const b = e.target.closest(".mbtn");
      if (!b) return;
      $("months").querySelectorAll(".mbtn").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      mesActivo = b.dataset.m;
      renderTimeline();
    });
  }

  /* ---------- timeline ---------- */
  function renderTimeline() {
    const list = DATA.events.filter((ev) => {
      if (mesActivo === "all") return true;
      const d = fecha(ev.start);
      return d && `${d.getFullYear()}-${d.getMonth()}` === mesActivo;
    });

    if (!list.length) {
      $("timeline").innerHTML = '<div class="empty">Nada en este mes</div>';
      return;
    }

    $("timeline").innerHTML = list.map((ev, i) => {
      const d = fecha(ev.start);
      const h = horaTxt(ev);
      const cuando = d
        ? `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]}${h ? " · " + h : ""}`
        : "FECHA POR CONFIRMAR";
      const past = ev.dias != null && ev.dias < 0;
      return `
      <div class="tl-item ${ev.free ? "free" : ""} ${past ? "past" : ""}" data-i="${i}" style="animation-delay:${i * 40}ms">
        <span class="tl-dot"></span>
        <div class="tl-head">
          <span class="tl-date">${esc(cuando)}</span>
          <span class="tl-cd">${esc(ev.countdown || "")}</span>
        </div>
        <div class="tl-main">
          ${ev.poster ? `<img class="tl-poster" src="${esc(ev.poster)}" alt="">` : ""}
          <div>
          <h3 class="tl-title">${esc(ev.title)}</h3>
          ${ev.subtitle ? `<p class="tl-sub">${esc(ev.subtitle)}</p>` : ""}
          </div>
        </div>
        <div class="tl-foot">
          <span>${esc(ev.venue || "por confirmar")}</span>
          <span class="dotsep">·</span>
          <span class="tl-price ${ev.free ? "free" : ""}">${esc(precioTxt(ev))}</span>
        </div>
      </div>`;
    }).join("");

    $("timeline").querySelectorAll(".tl-item").forEach((n) => {
      let fired = false;
      const open = (e) => {
        if (fired) return; fired = true;
        if (e && e.preventDefault) e.preventDefault();
        abrir(list[Number(n.dataset.i)]);
        setTimeout(() => { fired = false; }, 500);
      };
      n.addEventListener("pointerup", open);
      n.addEventListener("click", open);
    });
  }

  /* ---------- modal ---------- */
  function abrir(ev) {
    const d = fecha(ev.start);
    const fin = fecha(ev.end);
    let cuando = "Fecha por confirmar";
    if (d) {
      const h = horaTxt(ev);
      cuando = `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_LARGO[d.getMonth()]} ${d.getFullYear()}${h ? " · " + h : ""}`;
      if (fin && fin.getDate() !== d.getDate()) cuando += ` → ${fin.getDate()} ${MESES_LARGO[fin.getMonth()]}`;
    }

    $("mcDay").textContent = d ? String(d.getDate()).padStart(2, "0") : "—";
    $("mcMon").textContent = d ? MESES[d.getMonth()] : "";
    $("mcCd").textContent = ev.countdown || "EVENTO";
    var oldImg = $("modalCard").querySelector(".mc-poster");
    if (oldImg) oldImg.remove();
    if (ev.poster) {
      var im = document.createElement("img");
      im.className = "mc-poster";
      im.src = ev.poster; im.alt = "";
      $("modalCard").insertBefore(im, $("modalCard").firstChild);
    }
    $("mcTitle").textContent = ev.title;
    $("mcSub").textContent = ev.subtitle || "";
    $("mcChips").innerHTML = chipsHTML(ev, 8);

    const lineup = (ev.lineup || []).map((a) => `<span>${esc(a)}</span>`).join("");
    const rows = [
      ["Cuándo", `<strong>${esc(cuando)}</strong>`],
      ["Dónde", `<strong>${esc(ev.venue || "por confirmar")}</strong>${ev.address ? "<br>" + esc(ev.address) : ""}`],
      ["Precio", esc(ev.price || "Ver publicación")],
      lineup ? ["Lineup", `<div class="mc-lineup">${lineup}</div>`] : null,
      (ev.producers || []).length ? ["Produce", esc(ev.producers.join(" · "))] : null,
    ].filter(Boolean);

    $("mcRows").innerHTML = rows.map(([k, v]) => `<div class="mc-row"><div class="mc-k">${k}</div><div class="mc-v">${v}</div></div>`).join("");
    $("mcNote").textContent = ev.note || "";
    $("mcNote").style.display = ev.note ? "" : "none";

    const acts = [];
    if (ev.tickets) acts.push(`<a class="mbtn-lg primary" href="${esc(ev.tickets)}" target="_blank" rel="noopener"><span>Entradas</span><span>↗</span></a>`);
    if (ev.ig_post) acts.push(`<a class="mbtn-lg" href="${esc(ev.ig_post)}" target="_blank" rel="noopener"><span>Ver post en IG</span><span>↗</span></a>`);
    if (ev.gcal_link) acts.push(`<a class="mbtn-lg" href="${esc(ev.gcal_link)}" target="_blank" rel="noopener"><span>Google Calendar</span><span>↗</span></a>`);
    $("mcActions").innerHTML = acts.join("") || '<div class="mbtn-lg"><span>Sin links todavía</span><span>—</span></div>';

    const m = $("modal");
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add("open"));
    document.body.style.overflow = "hidden";
  }

  function cerrar() {
    const m = $("modal");
    m.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => { m.hidden = true; }, 360);
  }

  function iniciar(data) {
    DATA = data && data.events ? data : FALLBACK;
    $("nEvents").textContent = String(DATA.events.length).padStart(2, "0");
    $("stamp").textContent = DATA.generado_legible || "—";
    $("syncTxt").textContent = navigator.onLine ? "sync ok" : "offline";
    renderFeat();
    renderBars();
    renderMeses();
    renderTimeline();

    $("modalX").onclick = cerrar;
    $("modalBg").onclick = cerrar;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
    let y0 = null;
    $("modalCard").addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    $("modalCard").addEventListener("touchend", (e) => {
      if (y0 == null) return;
      if (e.changedTouches[0].clientY - y0 > 120 && $("modalCard").scrollTop <= 0) cerrar();
      y0 = null;
    }, { passive: true });
  }

  if (window.__EVENTS__) {
    iniciar(window.__EVENTS__);
  } else {
    fetch("../data/events.json", { cache: "no-store" }).then((r) => r.json()).then(iniciar).catch(() => iniciar(FALLBACK));
  }
})();
