/* GrooveRift refined prototype: generative Music DNA, "Spirala" (owner decision, session 9).
   A living double helix of two strands, Coral-leaning and Amber-leaning: two musical worlds wound together.
   How the picks shape it (all deterministic, seeded by the member's genres and artists):
   - Each genre is one section of the helix, joined to the next by a glowing knot, so the genres read
     as a connected chain. Each genre has a colour with a meaning (data.js, D-052), so colour, speed and
     size all come from the music. Tapping a section shows the genre's name for a moment.
   - Section length is the genre's weight: earlier picks weigh more, and every chosen artist adds weight
     to their genre. An artist is a bright bead riding the strand inside their genre's section.
   - Traits (data.js) set each section's height (energy), twist and spin speed (tempo), electric edge
     (jagged genres crackle), and behaviour: electronic sections pulse on a beat, rap and drum & bass
     flash in staccato, jazz and funk sway, folk and classical breathe slowly.
   - A per-member seed varies phase, height and bead positions, so the same genres with different
     artists still give a different helix.
   It stays gently alive after it is made: the helix turns and each section moves in its own way.
   "Smanji pokrete" or the OS reduced-motion setting leaves one still frame (see GR_MOTION in current.js).
   Not playback and not an equalizer: nothing is bound to audio (Master Prompt 15.4, 15.7).
   Decorative canvas (aria-hidden); app.js puts the text equivalent next to it. No dependencies. */
(function () {
  'use strict';
  const C = window.GR_CURRENT, D = window.GR_DATA, M = window.GR_MOTION;
  const { bolt, rng, hash, mix, rgba, noise, CORAL, AMBER, HOT } = C;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const BY = Object.fromEntries(D.genres.map(g => [g.n, g]));
  const MORE = Object.fromEntries(D.moreGenres.map(([n, p]) => [n, p]));
  const ARTIST_G = {}; D.artists.forEach(a => { if (!ARTIST_G[a.name]) ARTIST_G[a.name] = a.g; });

  function traits(name) {
    if (BY[name]) return BY[name];
    const p = MORE[name];
    return p && BY[p] ? Object.assign({}, BY[p], { n: name, parent: p }) : null;
  }
  function colorOf(name) { const g = traits(name); return g && g.c ? hex(g.c) : AMBER; }
  const CHAR = [20, 6, 10]; // charred black for heavy music (D-067)
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  /* Avatar ring: one arc per genre in its colour, with small gaps. */
  function ring(genres) {
    const gs = (genres || []).map(traits).filter(Boolean);
    if (!gs.length) return 'var(--gr-color-border-strong)';
    const seg = 360 / gs.length, gap = gs.length > 1 ? 7 : 0;
    return `conic-gradient(from -90deg, ${gs.map((g, i) => { const a = i * seg; return `${css(colorOf(g.n))} ${a}deg ${a + seg - gap}deg, transparent ${a + seg - gap}deg ${a + seg}deg`; }).join(', ')})`;
  }

  function model(genres, artists) {
    const gs = genres.map(traits).filter(Boolean);
    const arts = (artists || []).map(a => (typeof a === 'string' ? { name: a, g: ARTIST_G[a] || [] } : { name: a.name, g: a.g && a.g.length ? a.g : (ARTIST_G[a.name] || []) }));
    const seed = hash(genres.join('|') + '#' + arts.map(a => a.name).join('|'));
    const R = rng(seed);
    const fits = (a, g) => a.g.includes(g.n) || (g.parent && a.g.includes(g.parent));
    const wts = gs.map((g, i) => Math.min(2.4, 1 + Math.max(0, 0.45 - i * 0.12) + 0.25 * arts.filter(a => fits(a, g)).length));
    const tot = wts.reduce((s, x) => s + x, 0) || 1;
    let acc = 0;
    const segs = gs.map((g, i) => {
      const s = { g, u0: acc / tot, u1: (acc + wts[i]) / tot, col: colorOf(g.n), amp: 0.9 + R() * 0.2, ph: R() * Math.PI * 2,
        lambda: 64 - 36 * g.t + (R() * 8 - 4), spin: (0.5 + 1.7 * g.t) * (R() < 0.5 ? 1 : -1) * (0.85 + R() * 0.3), bpm: 84 + 70 * g.t };
      acc += wts[i]; return s;
    });
    const beads = arts.map(a => {
      let si = segs.findIndex(s => fits(a, s.g));
      if (si < 0) si = Math.floor(R() * segs.length);
      const s = segs[si];
      return s ? { si, u: s.u0 + (0.22 + R() * 0.56) * (s.u1 - s.u0), strand: R() < 0.5 ? 0 : 1, col: s.col } : null;
    }).filter(Boolean);
    return { gs, segs, beads, arts, seed, n1: noise(seed), n2: noise(seed ^ 0x2f) };
  }

  function segAt(m, u, hint) {
    let i = hint || 0;
    while (i < m.segs.length - 1 && u > m.segs[i].u1) i++;
    return i;
  }

  function draw(ctx, w, h, m, fx) {
    const pad = 14, L = w - pad * 2, cy = h / 2, t = fx.t, I = fx.I;
    if (!m.segs.length) {
      ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(w - pad, cy); ctx.strokeStyle = '#2A2F3B'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
      return;
    }
    // soft glow behind, in the member's own colours
    for (const s of m.segs) {
      const x = pad + ((s.u0 + s.u1) / 2) * L, r = Math.max(30, (s.u1 - s.u0) * L * 0.9);
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, r);
      g.addColorStop(0, rgba(s.col, 0.11 + 0.08 * I)); g.addColorStop(1, rgba(s.col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, cy - r, 2 * r, 2 * r);
    }
    const step = 2, N = Math.ceil(L / step), pts = new Array(N + 1);
    let si = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = pad + u * L;
      si = segAt(m, u, si);
      const s = m.segs[si], g = s.g, ul = (u - s.u0) / Math.max(1e-6, s.u1 - s.u0);
      const env = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, ul)))), 0.55);
      let A = h * (0.15 + 0.17 * g.e) * s.amp * env;
      if (g.k === 'swell') A *= 0.84 + 0.16 * Math.sin(t * 0.9 + ul * 2.5 + s.ph);
      else A *= 1 + 0.035 * Math.sin(t * 1.7 + s.ph);
      let ph = 2 * Math.PI * (x - pad - s.u0 * L) / s.lambda + s.ph + t * s.spin;
      if (g.k === 'swing') ph += 0.7 * g.s * Math.sin(x * 0.045 + t * 1.4);
      const edge = g.j > 0.55 ? (g.j - 0.55) / 0.45 : 0;
      const jit = edge * h * 0.03 * (0.6 + I) * env * (g.f === 0 ? 1.7 : 1); // heavy music crackles harder (D-067)
      const j1 = jit * m.n1(x * 0.4 + t * 11), j2 = jit * m.n2(x * 0.4 - t * 11);
      pts[i] = { x, s, ul, env, ph, y1: cy + A * Math.sin(ph) + j1, y2: cy - A * Math.sin(ph) + j2, z: Math.cos(ph) };
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // rungs: rounded bars and dots, after the waveform in the Rift Pulse symbol; each family moves its own way
    for (let i = 3; i < N - 2; i += 5) {
      const p = pts[i], s = p.s, g = s.g;
      const len = Math.abs(p.y1 - p.y2); if (len < 4) continue;
      const top = Math.min(p.y1, p.y2) + 2.5, bot = Math.max(p.y1, p.y2) - 2.5;
      let a = (0.22 + 0.5 * Math.abs(Math.sin(p.ph))) * p.env;
      const beat = Math.pow(Math.max(0, Math.cos(Math.PI * 2 * t * s.bpm / 60)), 6);
      if (g.k === 'square') a *= 0.45 + 0.9 * beat;
      if (g.k === 'burst') { const k = Math.floor(i / 5); a *= ((k + Math.floor(t * s.bpm / 30)) % 3 === 0) ? 1.3 : 0.25; }
      const col = mix(s.col, HOT, 0.15 + 0.25 * I);
      ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = rgba(col, 1); ctx.fillStyle = rgba(col, 1);
      if (g.k === 'saw') { ctx.beginPath(); bolt(ctx, p.x, top, p.x, bot, 1.4 + 1.6 * I, rng((i * 7919) ^ Math.floor(t * 18)), 4); ctx.lineWidth = 1.1; ctx.stroke(); }
      else if (g.k === 'swing' && Math.floor(i / 5) % 2) { ctx.beginPath(); ctx.arc(p.x, (p.y1 + p.y2) / 2, 1.9, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(p.x, bot); ctx.lineWidth = g.k === 'swell' ? 1.4 : 2.2; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // strands: back pieces first (thin, dim), then front pieces (wide, bright, glowing). Between the two passes a dark
    // edge is drawn under the front strand, so it visibly covers the back strand where it crosses: the depth cue.
    const DARK = [11, 13, 18];
    for (const front of [false, true]) {
      if (front) {
        ctx.globalCompositeOperation = 'source-over';
        for (let k = 0; k < 2; k++) {
          for (let i = 1; i <= N; i++) {
            const p = pts[i - 1], q = pts[i], z = k === 0 ? q.z : -q.z;
            if (z <= 0) continue;
            const d = (z + 1) / 2;
            ctx.beginPath(); ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2); ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
            ctx.strokeStyle = rgba(DARK, 0.7 * Math.min(1, z * 2.5) * q.env); ctx.lineWidth = 2.2 + 2.6 * d + 3; ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        for (let i = 1; i <= N; i++) {
          const p = pts[i - 1], q = pts[i];
          const z = k === 0 ? q.z : -q.z;
          if ((z > 0) !== front) continue;
          const d = (z + 1) / 2, s = q.s;
          const col = k === 0 ? s.col : mix(s.col, HOT, 0.42);
          ctx.beginPath(); ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2); ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
          ctx.strokeStyle = rgba(col, (0.18 + 0.82 * d) * (0.35 + 0.65 * q.env)); ctx.lineWidth = 0.7 + 2.6 * d; ctx.stroke();
          if (front && d > 0.5) { ctx.strokeStyle = rgba(col, (0.13 + 0.17 * I) * q.env); ctx.lineWidth = 7 + 4 * I; ctx.stroke(); }
        }
      }
    }
    /* Heavy music (family 0: metal, nu metal, punk, grunge and their subgenres; owner, D-067): a charred black core
       inside the front strands and a few sparks that fly off, so these sections read darker and more alive.
       Every other family is drawn exactly as before. */
    if (m.segs.some(s => s.g.f === 0)) {
      // a stronger glow first, so the black core sits inside a hot aura
      for (let k = 0; k < 2; k++) {
        for (let i = 1; i <= N; i++) {
          const p = pts[i - 1], q = pts[i];
          if (q.s.g.f !== 0) continue;
          const z = k === 0 ? q.z : -q.z; if (z <= 0) continue;
          const flick = 0.75 + 0.25 * Math.sin(t * 23 + i * 0.7);
          ctx.beginPath(); ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2); ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
          ctx.strokeStyle = rgba(mix(q.s.col, HOT, 0.2), (0.16 + 0.14 * I) * q.env * flick); ctx.lineWidth = 7 + 3 * z; ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < 2; k++) {
        for (let i = 1; i <= N; i++) {
          const p = pts[i - 1], q = pts[i];
          if (q.s.g.f !== 0) continue;
          const z = k === 0 ? q.z : -q.z; if (z <= 0.15) continue;
          const d = (z + 1) / 2;
          ctx.beginPath(); ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2); ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
          ctx.strokeStyle = rgba(CHAR, 0.8 * q.env * Math.min(1, (z - 0.15) * 3)); ctx.lineWidth = 0.5 + 1.1 * d; ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      m.segs.forEach((s, si) => {
        if (s.g.f !== 0) return;
        const R = rng((m.seed ^ (si * 977)) + Math.floor(t * 7)), n = R() < 0.75 ? 1 + Math.floor(R() * 3) : 0;
        for (let k = 0; k < n; k++) {
          const p = pts[Math.round((s.u0 + (0.15 + 0.7 * R()) * (s.u1 - s.u0)) * N)], y = R() < 0.5 ? p.y1 : p.y2;
          const ang = R() * Math.PI * 2, len = 6 + R() * 9;
          ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + Math.cos(ang) * len, y + Math.sin(ang) * len);
          ctx.strokeStyle = rgba(mix(s.col, HOT, 0.6), 0.95 * p.env); ctx.lineWidth = 1.3; ctx.stroke();
        }
      });
    }
    // knots that join the genres, and the two ends
    const knots = [0].concat(m.segs.map(s => s.u1));
    knots.forEach((u, k) => {
      const x = pad + u * L, a = m.segs[Math.max(0, k - 1)].col, b = m.segs[Math.min(m.segs.length - 1, k)].col;
      const col = mix(a, b, 0.5), pulse = 0.5 + 0.5 * Math.sin(t * 2 + k * 1.3);
      const r = (k === 0 || k === m.segs.length) ? 2 : 3 + pulse * 1.2 + 2 * I;
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, r * 4);
      g.addColorStop(0, rgba(HOT, 0.9)); g.addColorStop(0.3, rgba(col, 0.5)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r * 4, cy - r * 4, r * 8, r * 8);
    });
    // artists: bright beads riding the strands
    for (const b of m.beads) {
      const i = Math.max(0, Math.min(N, Math.round(b.u * N))), p = pts[i];
      const y = b.strand ? p.y2 : p.y1, z = b.strand ? -p.z : p.z, d = (z + 1) / 2;
      const r = 2.4 + 1.2 * d;
      const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, r * 3.4);
      g.addColorStop(0, rgba(HOT, 0.55 + 0.45 * d)); g.addColorStop(0.35, rgba(b.col, 0.45 * (0.4 + 0.6 * d))); g.addColorStop(1, rgba(b.col, 0));
      ctx.fillStyle = g; ctx.fillRect(p.x - r * 3.4, y - r * 3.4, r * 6.8, r * 6.8);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- mounting and animation ---------- */
  const states = new Map();
  const played = new Set();
  let raf = 0;
  let source = () => ({ genres: [], artists: [] });
  const sig = s => s.genres.join('|') + '#' + s.artists.map(a => (typeof a === 'string' ? a : a.name)).join('|');

  function setup(st) {
    const r = st.c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(60, Math.round(r.width)), h = +st.c.dataset.h || 200;
    if (st.w === w && st.h === h && st.dpr === dpr) return false;
    st.w = w; st.h = h; st.dpr = dpr;
    st.c.width = Math.round(w * dpr); st.c.height = Math.round(h * dpr); st.c.style.height = h + 'px';
    return true;
  }
  function paint(st, now) {
    const ctx = st.c.getContext('2d');
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, st.w, st.h);
    const still = M.reduced();
    const ct = st.charge == null || still ? 1e9 : now - st.charge;
    const I = ct < 1800 ? Math.exp(-ct / 600) : 0;
    const fade = st.prev && !still ? Math.max(0, 1 - (now - st.prevAt) / 420) : 0;
    if (fade > 0) { ctx.globalAlpha = fade; ctx.drawImage(st.prev, 0, 0, st.w, st.h); ctx.globalAlpha = 1; } else st.prev = null;
    draw(ctx, st.w, st.h, st.model, { t: still ? st.stillT : now / 1000, I });
  }
  function tick(now) {
    raf = 0;
    if (document.hidden || M.reduced()) return;
    let any = false;
    for (const [c, st] of states) {
      if (!c.isConnected) { states.delete(c); if (st.ro) st.ro.disconnect(); if (st.io) st.io.disconnect(); continue; }
      if (!st.visible) continue;
      paint(st, now); any = true;
    }
    if (any) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf && !M.reduced()) raf = requestAnimationFrame(tick); };

  function mount(c) {
    if (states.has(c)) return;
    const key = c.dataset.dna || 'dna';
    let src;
    if (c.dataset.genres != null) src = { genres: c.dataset.genres ? c.dataset.genres.split('|') : [], artists: c.dataset.artists ? c.dataset.artists.split('|') : [] };
    else src = source();
    const st = { c, key, fixed: c.dataset.genres != null, src, sig: sig(src), model: model(src.genres, src.artists), visible: false, stillT: 3.7 };
    states.set(c, st);
    setup(st);
    if (!played.has(key) && src.genres.length) { played.add(key); st.charge = performance.now(); }
    paint(st, performance.now());
    if (window.ResizeObserver) { st.ro = new ResizeObserver(() => { if (setup(st)) paint(st, performance.now()); }); st.ro.observe(c); }
    c.addEventListener('pointerdown', e => { st.charge = performance.now(); kick(); tip(st, e); });
    if (window.IntersectionObserver) {
      st.io = new IntersectionObserver(es => { st.visible = es.some(e => e.isIntersecting); if (st.visible) kick(); }, { threshold: 0.05 });
      st.io.observe(c);
    } else { st.visible = true; kick(); }
  }

  /* A short label with the genre (and its artists) of the tapped section; decorative, the text list is in app.js. */
  function tip(st, e) {
    const m = st.model; if (!m.segs.length) return;
    const r = st.c.getBoundingClientRect(), x = e.clientX - r.left, pad = 14;
    const u = Math.max(0, Math.min(1, (x - pad) / Math.max(1, r.width - pad * 2)));
    const s = m.segs[segAt(m, u, 0)];
    const host = st.c.parentElement; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    let el = host.querySelector(':scope > .dna-tip');
    if (!el) { el = document.createElement('span'); el.className = 'dna-tip'; el.setAttribute('aria-hidden', 'true'); host.appendChild(el); }
    el.innerHTML = '';
    const b = document.createElement('b'); b.textContent = s.g.n; el.appendChild(b);
    const cx = st.c.offsetLeft + pad + ((s.u0 + s.u1) / 2) * (r.width - pad * 2);
    el.style.left = Math.max(70, Math.min(host.clientWidth - 70, cx)) + 'px';
    el.style.top = (st.c.offsetTop + 4) + 'px';
    el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1800);
  }

  /* Call after the picks change: pictures that follow the app's picks crossfade into the new helix. */
  function refresh() {
    const s = source(), k = sig(s), now = performance.now();
    for (const st of states.values()) {
      if (st.fixed || st.sig === k) continue;
      if (!M.reduced() && st.c.width) { const off = document.createElement('canvas'); off.width = st.c.width; off.height = st.c.height; off.getContext('2d').drawImage(st.c, 0, 0); st.prev = off; st.prevAt = now; }
      st.src = s; st.sig = k; st.model = model(s.genres, s.artists); st.charge = now;
      paint(st, now);
    }
    kick();
  }
  M.onChange(() => { const now = performance.now(); for (const st of states.values()) paint(st, now); kick(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  window.GR_DNA = {
    traits, ring, colorOf: name => css(colorOf(name)),
    setSource(fn) { source = fn; },
    scan(root) { (root || document).querySelectorAll('canvas.dna').forEach(mount); },
    refresh,
    reset() { played.clear(); },
    zap() { const now = performance.now(); for (const st of states.values()) st.charge = now; kick(); }
  };
})();
