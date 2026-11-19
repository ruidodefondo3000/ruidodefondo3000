/* ===== V3 · audio.js — soundscapes sintetizados con Web Audio API =====
   Cada evento tiene su propia textura sonora, generada en el navegador.
   No hay archivos de audio: todo se sintetiza en vivo (funciona offline).
   El audio NO arranca solo: el usuario lo habilita con el botón SONIDO.
*/
(function () {
  "use strict";

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var active = null;        // { nodes:[], stop:fn, analyser, event }
  var enabled = false;
  var loopTimer = null;
  var loopEvent = null;
  var vizCallback = null;

  // ----- perfil sonoro por slug / género -----
  // ramp: tipo de envolvente; notes: escala; bpm; textura
  var PROFILES = {
    "disonantes-deminina": {
      name: "PSICODÉLICO",
      bpm: 84, wave: "sine", scale: [0, 3, 7, 10, 14, 17],
      pad: true, bell: true, swell: 2.4, detune: 7, filter: 1400, color: "#c084fc"
    },
    "pueblo-libre-rockea-vol-ii": {
      name: "PUNK / HARDCORE",
      bpm: 168, wave: "sawtooth", scale: [0, 3, 5, 7, 10],
      drive: true, stab: true, swell: .12, detune: 0, filter: 2600, color: "#d6ff3f"
    },
    "machine-girl-vol-ii": {
      name: "BREAKCORE",
      bpm: 172, wave: "square", scale: [0, 1, 6, 7, 11],
      glitch: true, stab: true, swell: .08, detune: 0, filter: 3200, color: "#f472b6"
    },
    "kosmika-2027": {
      name: "INDIE / KÓSMIKA",
      bpm: 112, wave: "triangle", scale: [0, 2, 4, 7, 9, 12],
      pad: true, bell: true, swell: 1.4, detune: 4, filter: 1900, color: "#22d3ee"
    },
    "nothing-us-2027": {
      name: "SHOEGAZE",
      bpm: 68, wave: "sawtooth", scale: [0, 2, 5, 7, 9],
      pad: true, wash: true, swell: 3.4, detune: 12, filter: 900, color: "#a5b4fc"
    }
  };

  var DEFAULT = {
    name: "EN VIVO", bpm: 100, wave: "triangle", scale: [0, 3, 5, 7, 10],
    pad: true, swell: 1, detune: 0, filter: 1800, color: "#8b5cf6"
  };

  function profileFor(ev) {
    if (ev && PROFILES[ev.slug]) return PROFILES[ev.slug];
    if (ev && ev.genres) {
      var g = ev.genres.join(" ").toLowerCase();
      if (/shoegaze|dream/.test(g)) return PROFILES["nothing-us-2027"];
      if (/breakcore|electr/.test(g)) return PROFILES["machine-girl-vol-ii"];
      if (/punk|hardcore/.test(g)) return PROFILES["pueblo-libre-rockea-vol-ii"];
      if (/psicod/.test(g)) return PROFILES["disonantes-deminina"];
      if (/indie|rock alt/.test(g)) return PROFILES["kosmika-2027"];
    }
    return DEFAULT;
  }

  function ensureCtx() {
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function midi(n) { return 110 * Math.pow(2, n / 12); }

  function makeNoiseBuffer(dur) {
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---- genera un loop de `bars` compases con la firma del evento ---- */
  function build(event) {
    var p = profileFor(event);
    var c = ensureCtx();
    if (!c) return null;

    var nodes = [];
    var out = c.createGain();
    out.gain.value = 1;

    var filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = p.filter;
    filter.Q.value = p.wash ? 1.6 : 0.7;

    var analyser = c.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    out.connect(filter);
    filter.connect(analyser);
    analyser.connect(master);

    var beat = 60 / p.bpm;
    var t0 = c.currentTime + 0.06;
    var loopDur = beat * 8;                       // 8 beats por ciclo

    // --- capa de pad / wash ---
    if (p.pad || p.wash) {
      p.scale.forEach(function (step, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = p.wave;
        o.frequency.value = midi(step + (i % 2 ? 12 : 0));
        o.detune.value = (i - p.scale.length / 2) * p.detune;
        var base = p.wash ? 0.045 : 0.03;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(base, t0 + p.swell);
        g.gain.setValueAtTime(base, t0 + loopDur - p.swell);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + loopDur);
        o.connect(g); g.connect(out);
        o.start(t0); o.stop(t0 + loopDur + .02);
        nodes.push(o, g);
      });
    }

    // --- capa rítmica ---
    var hits = p.glitch ? 16 : (p.stab || p.drive ? 8 : 4);
    for (var h = 0; h < hits; h++) {
      var t = t0 + (h * loopDur / hits);
      if (p.glitch && Math.random() < .22) continue;   // glitches aleatorios

      var o2 = c.createOscillator();
      var g2 = c.createGain();
      o2.type = p.wave;
      var step = p.scale[h % p.scale.length];
      o2.frequency.setValueAtTime(midi(step + 24), t);
      if (p.glitch) o2.frequency.exponentialRampToValueAtTime(midi(step + 12), t + .04);
      var vol = p.drive || p.stab ? .085 : .035;
      var dec = p.drive ? .07 : (p.swell > 1 ? .4 : .18);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol, t + .008);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o2.connect(g2); g2.connect(out);
      o2.start(t); o2.stop(t + dec + .02);
      nodes.push(o2, g2);

      // sub-bass en el downbeat
      if (h % (p.drive ? 2 : 4) === 0) {
        var b = c.createOscillator();
        var bg = c.createGain();
        b.type = "sine";
        b.frequency.value = midi(p.scale[0] - 12);
        bg.gain.setValueAtTime(0.0001, t);
        bg.gain.exponentialRampToValueAtTime(p.drive ? .16 : .09, t + .01);
        bg.gain.exponentialRampToValueAtTime(0.0001, t + (p.drive ? .13 : .3));
        b.connect(bg); bg.connect(out);
        b.start(t); b.stop(t + .5);
        nodes.push(b, bg);
      }
    }

    // --- campanas / twinkle ---
    if (p.bell) {
      [0, 2, 5].forEach(function (idx, k) {
        var t = t0 + beat * (k + 1.5);
        var o3 = c.createOscillator();
        var g3 = c.createGain();
        o3.type = "sine";
        o3.frequency.value = midi(p.scale[idx] + 24);
        g3.gain.setValueAtTime(0.0001, t);
        g3.gain.exponentialRampToValueAtTime(.05, t + .01);
        g3.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o3.connect(g3); g3.connect(out);
        o3.start(t); o3.stop(t + 1.3);
        nodes.push(o3, g3);
      });
    }

    // --- ruido textura (wash / drive) ---
    if (p.wash || p.drive) {
      var src = c.createBufferSource();
      src.buffer = makeNoiseBuffer(loopDur);
      var ng = c.createGain();
      var nf = c.createBiquadFilter();
      nf.type = p.wash ? "bandpass" : "highpass";
      nf.frequency.value = p.wash ? 700 : 3000;
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.exponentialRampToValueAtTime(p.wash ? .035 : .012, t0 + p.swell);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + loopDur);
      src.connect(nf); nf.connect(ng); ng.connect(out);
      src.start(t0); src.stop(t0 + loopDur);
      nodes.push(src, ng, nf);
    }

    return {
      profile: p, analyser: analyser, nodes: nodes, out: out,
      loopDur: loopDur, startAt: t0, event: event
    };
  }

  function fadeMaster(target, time) {
    if (!ctx || !master) return;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(Math.max(target, 0.0001), now + time);
  }

  /* ---- API pública ---- */
  var API = {
    isEnabled: function () { return enabled; },
    getProfile: function (ev) { return profileFor(ev); },

    enable: function () {
      enabled = true;
      ensureCtx();
      fadeMaster(0.9, 0.35);
      return !!ctx;
    },

    disable: function () {
      enabled = false;
      fadeMaster(0.0001, 0.25);
    },

    // reemplaza el soundscape actual por el del evento (en loop)
    play: function (event) {
      if (!enabled) return null;
      API.stop();
      loopEvent = event;
      var built = build(event);
      if (!built) { loopEvent = null; return null; }
      active = built;
      fadeMaster(0.9, 0.2);
      // re-dispara el ciclo para que el soundscape continúe en loop
      var durMs = Math.max(1000, built.loopDur * 1000 - 120);
      loopTimer = setInterval(function () {
        if (!enabled || !loopEvent) return;
        try {
          var nb = build(loopEvent);
          if (nb) {
            var prev = active;
            active = nb;
            if (prev) {
              try { prev.out.gain.setTargetAtTime(0.0001, ctx.currentTime, .08); } catch (e) {}
              setTimeout((function (p) {
                return function () {
                  p.nodes.forEach(function (n) { try { n.stop(); } catch (e2) {} try { n.disconnect(); } catch (e3) {} });
                  try { p.out.disconnect(); } catch (e4) {}
                };
              })(prev), 400);
            }
          }
        } catch (e5) {}
      }, durMs);
      return built.profile;
    },

    stop: function () {
      if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
      loopEvent = null;
      if (!active) return;
      var a = active;
      active = null;
      try { a.out.gain.setTargetAtTime(0.0001, ctx.currentTime, .05); } catch (e) {}
      setTimeout(function () {
        a.nodes.forEach(function (n) { try { n.stop(); } catch (e2) {} try { n.disconnect(); } catch (e3) {} });
        try { a.out.disconnect(); } catch (e) {}
      }, 260);
    },

    isPlaying: function () { return !!active; },

    onFrame: function (cb) { vizCallback = cb; },

    // devuelve un array de amplitudes 0..1 para visualizar
    spectrum: function () {
      if (!active || !active.analyser) return null;
      var arr = new Uint8Array(active.analyser.frequencyBinCount);
      active.analyser.getByteFrequencyData(arr);
      var out = [];
      var step = Math.max(1, Math.floor(arr.length / 32));
      for (var i = 0; i < arr.length; i += step) out.push(arr[i] / 255);
      return out;
    },

    color: function () { return active ? active.profile.color : "#8b5cf6"; }
  };

  window.Sound = API;
})();
