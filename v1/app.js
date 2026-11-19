/* ===== V1 app.js ===== */
(function () {
  const FALLBACK = { handle: "ruido.de.fondo.3000", ig_url: "https://instagram.com/ruido.de.fondo.3000", events: [] };

  const el = (id) => document.getElementById(id);
  const MESES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SET","OCT","NOV","DIC"];
  const MESES_LARGO = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
  const DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];

  let DATA = FALLBACK;
  let filtro = "all";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fechaDe(iso) {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? iso + "T12:00:00-05:00" : iso);
    return isNaN(d) ? null : d;
  }

  function precioTexto(ev) {
    if (ev.free) return "GRATIS";
    if (ev.price) return ev.price.length > 22 ? ev.price.split("·")[0].trim() + "+" : ev.price;
    return "VER POST";
  }

  function esEstaSemana(ev) {
    const d = fechaDe(ev.start);
    if (!d) return false;
    const hoy = new Date();
    const diff = (d - hoy) / 86400000;
    return diff >= -1 && diff <= 7;
  }

  function esIntl(ev) {
    return (ev.tags || []).some((t) => /internacional/i.test(t)) ||
      (ev.genres || []).some((g) => /breakcore|shoegaze|dream pop/i.test(g)) ||
      /US|\(Chile\)|\(MX\)|\(México\)/i.test(ev.subtitle || "");
  }

  function pasaFiltro(ev) {
    if (filtro === "week") return esEstaSemana(ev);
    if (filtro === "free") return !!ev.free;
    if (filtro === "intl") return esIntl(ev);
    return true;
  }

  function renderMarquee() {
    const items = DATA.events.slice(0, 6).map((e) => e.title);
    const txt = (items.concat(items)).map((t) => `<span>${esc(t)}</span>`).join("");
    el("marqueeTrack").innerHTML = txt;
  }

  function renderStack() {
    const stack = el("stack");
    const list = DATA.events.filter(pasaFiltro);

    if (!list.length) {
      stack.innerHTML = '<div class="empty">Nada por acá todavía</div>';
      return;
    }

    stack.innerHTML = list.map((ev, i) => {
      const d = fechaDe(ev.start);
      const dia = d ? String(d.getDate()).padStart(2, "0") : "—";
      const mes = d ? MESES[d.getMonth()] : "";
      const countTxt = ev.free ? "ENTRADA LIBRE" : (ev.countdown || "");
      const tags = []
        .concat(ev.free ? ["GRATIS"] : [])
        .concat(ev.genres || [])
        .concat((ev.tags || []).slice(0, 2));

      return `
      <article class="card ${ev.free ? "is-free" : "is-paid"}" data-i="${i}" style="animation-delay:${i * 45}ms">
        <div class="card-head">
          <div class="card-left">
            ${ev.poster ? `<img class="card-poster" src="${esc(ev.poster)}" alt="">` : ""}
            <div>
            <h2 class="card-title">${esc(ev.title)}</h2>
            ${ev.subtitle ? `<p class="card-sub">${esc(ev.subtitle)}</p>` : ""}
            </div>
          </div>
          <div class="card-when">
            <div class="card-day">${dia}</div>
            <div class="card-mon">${mes}</div>
            ${countTxt ? `<div class="card-count">${esc(countTxt)}</div>` : ""}
          </div>
        </div>
        <div class="card-meta">
          ${tags.slice(0, 4).map((t, k) => `<span class="tag${k === 0 && ev.free ? " hot" : ""}">${esc(t)}</span>`).join("")}
        </div>
        <div class="card-foot">
          <span>${esc(ev.venue || "Por confirmar")}</span>
          <span class="card-price">${esc(precioTexto(ev))}</span>
        </div>
      </article>`;
    }).join("");

    stack.querySelectorAll(".card").forEach((card) => {
      let fired = false;
      const open = (e) => {
        if (fired) return; fired = true;
        if (e && e.preventDefault) e.preventDefault();
        abrirDetalle(list[Number(card.dataset.i)]);
        setTimeout(() => { fired = false; }, 500);
      };
      card.addEventListener("pointerup", open);
      card.addEventListener("click", open);
    });
  }

  function renderHero() {
    el("eventCount").textContent = String(DATA.events.length).padStart(2, "0");
    const next = DATA.events[0];
    el("heroNext").textContent = next ? `PRÓXIMO · ${next.title}` : "SIN FECHAS";
    el("stamp").textContent = DATA.generado_legible || "—";
  }

  function abrirDetalle(ev) {
    const d = fechaDe(ev.start);
    const dfin = fechaDe(ev.end);
    let cuando = "Fecha por confirmar";
    if (d) {
      const hh = d.getHours(), mm = d.getMinutes();
      const hora = ev.start.length === 10 ? "" : ` · ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      cuando = `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_LARGO[d.getMonth()]} ${d.getFullYear()}${hora}`;
    }
    if (dfin && d && dfin.getDate() !== d.getDate()) {
      cuando += ` → ${dfin.getDate()} ${MESES_LARGO[dfin.getMonth()]}`;
    }

    const lineup = (ev.lineup || []).map((a) => `<span>${esc(a)}</span>`).join("");
    const acciones = [];
    if (ev.tickets) acciones.push(`<a class="btn btn-primary" href="${esc(ev.tickets)}" target="_blank" rel="noopener"><span>Entradas</span><span>↗</span></a>`);
    if (ev.ig_post) acciones.push(`<a class="btn btn-ghost" href="${esc(ev.ig_post)}" target="_blank" rel="noopener"><span>Post original</span><span>↗</span></a>`);
    if (ev.gcal_link) acciones.push(`<a class="btn btn-ghost" href="${esc(ev.gcal_link)}" target="_blank" rel="noopener"><span>Añadir / ver en Calendar</span><span>↗</span></a>`);

    el("sheetBody").innerHTML = `
      ${ev.poster ? `<img class="sh-poster" src="${esc(ev.poster)}" alt="Poster de ${esc(ev.title)}">` : ""}
      <div class="sh-eyebrow">${esc(ev.countdown || "EVENTO")} ${ev.district ? "· " + esc(ev.district) : ""}</div>
      <h2 class="sh-title">${esc(ev.title)}</h2>
      ${ev.subtitle ? `<p class="sh-sub">${esc(ev.subtitle)}</p>` : ""}
      <div class="sh-badges">
        ${ev.free ? '<span class="tag hot">GRATIS</span>' : ""}
        ${(ev.genres || []).map((g) => `<span class="tag">${esc(g)}</span>`).join("")}
        ${(ev.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
      </div>
      <div class="sh-grid">
        <div class="sh-row"><div class="sh-k">Cuándo</div><div class="sh-v"><strong>${esc(cuando)}</strong></div></div>
        <div class="sh-row"><div class="sh-k">Dónde</div><div class="sh-v"><strong>${esc(ev.venue || "Por confirmar")}</strong>${ev.address ? "<br>" + esc(ev.address) : ""}</div></div>
        <div class="sh-row"><div class="sh-k">Precio</div><div class="sh-v">${esc(ev.price || "Ver publicación")}</div></div>
        ${lineup ? `<div class="sh-row"><div class="sh-k">Lineup</div><div class="sh-v"><div class="sh-lineup">${lineup}</div></div></div>` : ""}
        ${(ev.producers || []).length ? `<div class="sh-row"><div class="sh-k">Produce</div><div class="sh-v">${esc(ev.producers.join(" · "))}</div></div>` : ""}
      </div>
      ${ev.note ? `<p class="sh-note">${esc(ev.note)}</p>` : ""}
      <div class="sh-actions">
        ${acciones.join("") || '<div class="btn btn-ghost"><span>Sin links por ahora</span><span>—</span></div>'}
      </div>`;

    const wrap = el("sheetWrap");
    wrap.hidden = false;
    requestAnimationFrame(() => wrap.classList.add("is-open"));
    document.body.style.overflow = "hidden";
  }

  function cerrar() {
    const wrap = el("sheetWrap");
    wrap.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => { wrap.hidden = true; }, 340);
  }

  function bind() {
    el("sheetBackdrop").addEventListener("click", cerrar);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });

    // swipe-down para cerrar
    let y0 = null;
    el("sheet").addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    el("sheet").addEventListener("touchend", (e) => {
      if (y0 == null) return;
      const dy = e.changedTouches[0].clientY - y0;
      if (dy > 110 && el("sheet").scrollTop <= 0) cerrar();
      y0 = null;
    }, { passive: true });

    el("filters").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      el("filters").querySelectorAll(".chip").forEach((c) => c.classList.remove("is-on"));
      b.classList.add("is-on");
      filtro = b.dataset.f;
      renderStack();
    });
  }

  function iniciar(data) {
    DATA = data && data.events ? data : FALLBACK;
    renderMarquee();
    renderHero();
    renderStack();
    bind();
    const dot = el("liveDot");
    if (!navigator.onLine) { dot.style.background = "#ff3b1f"; el("liveTxt").textContent = "OFFLINE"; }
  }

  // carga: primero events.js (funciona en file://), luego fetch como respaldo
  if (window.__EVENTS__) {
    iniciar(window.__EVENTS__);
  } else {
    fetch("../data/events.json", { cache: "no-store" })
      .then((r) => r.json())
      .then(iniciar)
      .catch(() => iniciar(FALLBACK));
  }
})();
