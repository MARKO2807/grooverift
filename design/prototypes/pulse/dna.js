/* GrooveRift refined prototype: generative Music DNA visual (three variants for the owner to compare).
   Deterministic: the same genres and artists always give the same picture (seeded by the picks).
   Each genre carries design-placeholder traits (data.js): energy, tempo, edge, swing, hue and wave form.
     map    "Konstelacija": all main genres sit on one ring, grouped by family. Your genres light up and
            are joined by current into your own rift shape. Wide taste gives a wide shape.
     helix  "Spirala": a double helix of a Coral and an Amber strand. Each genre is one section, and its
            traits set the twist, the height and how electric the strands are.
     signal "Signal": a mirrored signature waveform, one section per genre, each with its own wave form.
   Not an equalizer and not playback: no bars bound to audio, no play control (Master Prompt 15.4, 15.7).
   Motion: a short charge (under 2 s) when the picture first appears or the picks change; then still.
   prefers-reduced-motion: no charge, no crossfade. ?motion=loop keeps a soft crackle (review only).
   Decorative canvas (aria-hidden). The text equivalent is rendered by app.js next to it. */
(function () {
  'use strict';
  const C = window.GR_CURRENT;
  const D = window.GR_DATA;
  const { bolt, rng, hash, mix, rgba, CORAL, AMBER, HOT } = C;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const P = new URLSearchParams(location.search);
  const LOOP = P.get('motion') === 'loop';
  const VARIANTS = ['map', 'helix', 'signal'];
  const NAMES = { map: 'Konstelacija', helix: 'Spirala', signal: 'Signal' };
  const RING = ['Metal', 'Nu metal', 'Grunge', 'Punk', 'Rock', 'Alternativa', 'Indie', 'Pop', 'Disco', 'R&B', 'Rap', 'Trap',
    'Drum & bass', 'Techno', 'House', 'Elektronika', 'Funk', 'Soul', 'Jazz', 'Blues', 'Reggae', 'Folk', 'Kantautorska', 'Klasična'];
  const BY = Object.fromEntries(D.genres.map(g => [g.n, g]));
  const MORE = Object.fromEntries(D.moreGenres.map(([n, p]) => [n, p]));
  const ARTIST_G = {}; D.artists.forEach(a => { if (!ARTIST_G[a.name]) ARTIST_G[a.name] = a.g; });

  function traits(name) {
    if (BY[name]) return BY[name];
    const p = MORE[name];
    return p && BY[p] ? Object.assign({}, BY[p], { n: name, parent: p }) : null;
  }
  const hue = w => mix(CORAL, AMBER, Math.max(0, Math.min(1, w)));
  const avg = (gs, k) => gs.reduce((s, g) => s + g[k], 0) / (gs.length || 1);

  /* Traits in words, for the text next to the picture. Descriptive only: no scores, no percentages. */
  function summary(genres) {
    const gs = genres.map(traits).filter(Boolean);
    if (!gs.length) return null;
    const e = avg(gs, 'e'), s = avg(gs, 's'), fam = new Set(gs.map(g => g.f)).size;
    return [
      { k: 'Energija', v: e < 0.45 ? 'mirna' : e < 0.72 ? 'živa' : 'žestoka' },
      { k: 'Ritam', v: s < 0.3 ? 'ravan' : s < 0.62 ? 'pulsirajući' : 'njihav' },
      { k: 'Raspon', v: fam >= 4 ? 'širok' : fam >= 2 ? 'srednji' : 'usmjeren' }
    ];
  }

  /* Avatar ring: one arc per genre in its hue, with small gaps. */
  function ring(genres) {
    const gs = (genres || []).map(traits).filter(Boolean);
    if (!gs.length) return 'var(--gr-color-border-strong)';
    const seg = 360 / gs.length, gap = gs.length > 1 ? 7 : 0;
    const parts = gs.map((g, i) => { const c = hue(g.w); const a = i * seg; return `rgb(${c}) ${a}deg ${a + seg - gap}deg, transparent ${a + seg - gap}deg ${a + seg}deg`; });
    return `conic-gradient(from -90deg, ${parts.join(', ')})`;
  }

  function model(genres, artists) {
    const gs = genres.map(traits).filter(Boolean);
    return { gs, artists: artists || [], seed: hash(genres.join('|') + '#' + (artists || []).join('|')) };
  }

  /* ---------- variant: map ("Konstelacija") ---------- */
  function ringAngle(name) {
    let i = RING.indexOf(name), off = 0;
    if (i < 0) { const p = MORE[name]; i = RING.indexOf(p); off = ((hash(name) % 9) - 4) * 0.6; }
    return -Math.PI / 2 + (i + off / 15) * (2 * Math.PI / RING.length);
  }
  function drawMap(ctx, w, h, m, fx) {
    /* Fit: centre the member's own shape and let it use the space; the ring stays as faint context. */
    const R0 = Math.max(40, Math.min(w / 2 - 70, h / 2 - 26));
    let cx = w / 2, cy = h / 2, R = R0;
    if (m.gs.length >= 2) {
      const pts = m.gs.map(g => { const a = ringAngle(g.n), r = 0.84 + 0.16 * g.e; return [Math.cos(a) * r, Math.sin(a) * r]; });
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
      const S = Math.min(R0 * 1.75, (w - 150) / Math.max(0.5, bx1 - bx0), (h - 56) / Math.max(0.5, by1 - by0));
      R = Math.max(R0, S);
      cx = w / 2 - R * (bx0 + bx1) / 2; cy = h / 2 - R * (by0 + by1) / 2;
    }
    // the ring of every main genre
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(42,47,59,0.9)'; ctx.lineWidth = 1; ctx.stroke();
    RING.forEach((n, i) => {
      const a = -Math.PI / 2 + i * (2 * Math.PI / RING.length);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 1.7, 0, Math.PI * 2); ctx.fillStyle = '#4F5564'; ctx.fill();
    });
    if (!m.gs.length) return;
    const nodes = m.gs.map(g => {
      const a = ringAngle(g.n), r = R * (0.84 + 0.16 * g.e);
      return { g, a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, c: hue(g.w) };
    });
    const sorted = nodes.slice().sort((p, q) => p.a - q.a);
    const sr = rng(m.seed);
    const cr = fx.I > 0 ? fx.rnd : rng(m.seed ^ 77);
    // body
    if (sorted.length > 2) {
      ctx.beginPath(); sorted.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      const mc = hue(avg(m.gs, 'w'));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, rgba(mc, 0.26 + 0.12 * fx.I)); g.addColorStop(1, rgba(mc, 0.05));
      ctx.fillStyle = g; ctx.fill();
    }
    // collisions: pick-order chords between different families, curved through the middle
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < nodes.length; i++) {
      const p = nodes[i - 1], q = nodes[i];
      if (p.g.f === q.g.f) continue;
      const gr = ctx.createLinearGradient(p.x, p.y, q.x, q.y); gr.addColorStop(0, rgba(p.c, 0.5)); gr.addColorStop(1, rgba(q.c, 0.5));
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(cx + (p.x + q.x - 2 * cx) * 0.15, cy + (p.y + q.y - 2 * cy) * 0.15, q.x, q.y);
      ctx.strokeStyle = gr; ctx.lineWidth = 1; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // edges of the shape: current, rougher for jagged genres
    const edges = sorted.length === 2 ? [[sorted[0], sorted[1]]] : sorted.map((p, i) => [p, sorted[(i + 1) % sorted.length]]);
    if (sorted.length === 1) edges.length = 0;
    for (const [p, q] of edges) {
      const j = (p.g.j + q.g.j) / 2;
      const amp = 1.2 + j * 7 + fx.I * 4;
      const seed = hash(p.g.n + q.g.n) ^ m.seed;
      const rr = fx.I > 0 ? cr : rng(seed);
      const gr = ctx.createLinearGradient(p.x, p.y, q.x, q.y); gr.addColorStop(0, rgba(p.c, 1)); gr.addColorStop(1, rgba(q.c, 1));
      const pts = [];
      const path = () => { ctx.beginPath(); bolt({ moveTo: (x, y) => { pts.length = 0; pts.push([x, y]); }, lineTo: (x, y) => pts.push([x, y]) }, p.x, p.y, q.x, q.y, amp, rr, 6); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); };
      path();
      ctx.strokeStyle = gr; ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.14 + 0.2 * fx.I; ctx.lineWidth = 7; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1.8; ctx.stroke();
      if (fx.I > 0.05) { ctx.strokeStyle = rgba(HOT, fx.I * 0.9); ctx.lineWidth = 0.8; ctx.stroke(); }
    }
    // artists: small satellites near their genre
    m.artists.forEach((name, i) => {
      const gl = ARTIST_G[name];
      const a = gl ? ringAngle(gl[0]) + ((sr() * 2 - 1) * 0.16) : sr() * Math.PI * 2;
      const r = R * (0.5 + sr() * 0.22);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const c = gl && traits(gl[0]) ? hue(traits(gl[0]).w) : hue(sr());
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fillStyle = rgba(c, 0.95); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = rgba(c, 0.14); ctx.fill();
    });
    // core
    const mx = nodes.reduce((s, p) => s + p.x, 0) / nodes.length, my = nodes.reduce((s, p) => s + p.y, 0) / nodes.length;
    const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 16 + 10 * fx.I);
    cg.addColorStop(0, rgba(HOT, 0.85)); cg.addColorStop(0.3, rgba(hue(avg(m.gs, 'w')), 0.45)); cg.addColorStop(1, rgba(AMBER, 0));
    ctx.fillStyle = cg; ctx.fillRect(mx - 30, my - 30, 60, 60);
    // nodes
    for (const p of nodes) {
      const r = 3.2 + 2.6 * p.g.e;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2);
      g.addColorStop(0, rgba(p.c, 0.55)); g.addColorStop(1, rgba(p.c, 0));
      ctx.fillStyle = g; ctx.fillRect(p.x - r * 4, p.y - r * 4, r * 8, r * 8);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = rgba(p.c, 1); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.42, 0, Math.PI * 2); ctx.fillStyle = rgba(HOT, 0.9); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // labels outside the ring, nudged apart when they collide
    ctx.font = '600 11px Inter, "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const boxes = [];
    for (const p of sorted) {
      let rr = R + 13;
      const tw = ctx.measureText(p.g.n).width;
      let x, y, bx;
      for (let k = 0; k < 4; k++) {
        x = cx + Math.cos(p.a) * rr; y = cy + Math.sin(p.a) * rr;
        const al = Math.cos(p.a) > 0.3 ? 'left' : Math.cos(p.a) < -0.3 ? 'right' : 'center';
        bx = al === 'left' ? x : al === 'right' ? x - tw : x - tw / 2;
        p.al = al;
        if (!boxes.some(b => bx < b.x + b.w + 4 && bx + tw + 4 > b.x && Math.abs(y - b.y) < 13)) break;
        rr += 12;
      }
      bx = Math.max(2, Math.min(w - tw - 2, bx));
      y = Math.max(8, Math.min(h - 8, y));
      boxes.push({ x: bx, y, w: tw });
      ctx.fillStyle = 'rgba(241,243,247,0.92)'; ctx.textAlign = 'left'; ctx.fillText(p.g.n, bx, y);
    }
  }

  /* ---------- variant: helix ("Spirala") ---------- */
  function blendAt(m, u) {
    const n = m.gs.length, pos = u * n - 0.5;
    const i = Math.max(0, Math.min(n - 1, Math.floor(pos))), j = Math.min(n - 1, i + 1);
    let f = Math.max(0, Math.min(1, pos - i)); f = f * f * (3 - 2 * f);
    const a = m.gs[i], b = m.gs[j];
    const o = {};
    for (const k of ['e', 't', 'j', 's', 'w']) o[k] = a[k] + (b[k] - a[k]) * f;
    o.seg = Math.max(0, Math.min(n - 1, Math.floor(u * n)));
    return o;
  }
  function drawHelix(ctx, w, h, m, fx) {
    const pad = 12, cy = h / 2, L = w - pad * 2;
    if (!m.gs.length) { ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(w - pad, cy); ctx.strokeStyle = '#2A2F3B'; ctx.lineWidth = 2; ctx.stroke(); return; }
    const sr = rng(m.seed), cr = fx.I > 0 ? fx.rnd : rng(m.seed ^ 91);
    const step = 2, N = Math.ceil(L / step);
    const pts = []; let ph = sr() * Math.PI * 2;
    const segW = L / m.gs.length;
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = pad + u * L, t = blendAt(m, u);
      const turns = 0.7 + 1.3 * t.t;
      ph += (2 * Math.PI * turns / segW) * step;
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.4);
      const A = h * (0.17 + 0.17 * t.e) * env;
      const jit = (t.j * h * 0.03 + fx.I * h * 0.03) * env;
      pts.push({ x, ph, A, t, y1: cy + A * Math.sin(ph) + (cr() * 2 - 1) * jit, y2: cy - A * Math.sin(ph) + (cr() * 2 - 1) * jit, z: Math.cos(ph) });
    }
    ctx.lineCap = 'round';
    // rungs: rounded bars with dots, after the waveform in the Rift Pulse symbol
    const every = 4;
    for (let i = 2; i < pts.length - 2; i += every) {
      const p = pts[i], len = Math.abs(p.y1 - p.y2);
      if (len < 3) continue;
      const c = hue(p.t.w);
      const top = Math.min(p.y1, p.y2) + 2.5, bot = Math.max(p.y1, p.y2) - 2.5;
      const a = 0.25 + 0.55 * Math.abs(Math.sin(p.ph));
      ctx.globalAlpha = a; ctx.strokeStyle = rgba(c, 1);
      if (p.t.j > 0.6) { ctx.beginPath(); bolt(ctx, p.x, top, p.x, bot, 1.6 + fx.I * 2, cr, 4); ctx.lineWidth = 1.2; ctx.stroke(); }
      else if (p.t.s > 0.7 && (i / every) % 2) { ctx.beginPath(); ctx.arc(p.x, cy, 1.8, 0, Math.PI * 2); ctx.fillStyle = rgba(c, 1); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(p.x, bot); ctx.lineWidth = 2.2; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // strands, back pieces first
    ctx.globalCompositeOperation = 'lighter';
    for (const front of [false, true]) {
      for (const [k, col] of [[1, CORAL], [2, AMBER]]) {
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i - 1], q = pts[i];
          const z = k === 1 ? q.z : -q.z;
          if ((z > 0) !== front) continue;
          const d = (z + 1) / 2;
          ctx.beginPath(); ctx.moveTo(p.x, k === 1 ? p.y1 : p.y2); ctx.lineTo(q.x, k === 1 ? q.y1 : q.y2);
          ctx.strokeStyle = rgba(col, 0.3 + 0.7 * d); ctx.lineWidth = 0.9 + 2 * d; ctx.stroke();
          if (front && d > 0.55) { ctx.strokeStyle = rgba(col, 0.12 + 0.18 * fx.I); ctx.lineWidth = 6 + 4 * fx.I; ctx.stroke(); }
          if (front && fx.I > 0.05 && d > 0.6) { ctx.strokeStyle = rgba(HOT, fx.I * 0.8); ctx.lineWidth = 0.8; ctx.stroke(); }
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // section ticks under the helix: one short line per genre, in its hue
    m.gs.forEach((g, i) => {
      const x0 = pad + i * segW + 4, x1 = pad + (i + 1) * segW - 4;
      ctx.beginPath(); ctx.moveTo(x0, h - 3); ctx.lineTo(x1, h - 3); ctx.strokeStyle = rgba(hue(g.w), 0.7); ctx.lineWidth = 2; ctx.stroke();
    });
  }

  /* ---------- variant: signal ("Signal") ---------- */
  function waveAt(kind, x, g, rnd) {
    const base = 0.5 + 0.5 * g.e;
    switch (kind) {
      case 'saw': return base * (0.5 + 0.5 * Math.abs(rnd() * 2 - 1));
      case 'drive': return base * (0.62 + 0.3 * Math.abs(Math.sin(x * 0.09)) + 0.08 * rnd());
      case 'square': { const per = 24 - 10 * g.t, f = (x % per) / per; return base * (f < 0.5 ? 1 : 0.34); }
      case 'burst': { const per = 15, f = (x % per) / per, grp = Math.floor(x / per) % 4 === 3 ? 0.2 : 1; return base * (0.22 + 0.78 * Math.exp(-Math.pow((f - 0.25) / 0.11, 2)) * grp); }
      case 'swing': return base * (0.32 + 0.68 * Math.abs(Math.sin(x * 0.075 + 0.9 * Math.sin(x * 0.031))));
      case 'swell': return base * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(x * 0.024)));
      default: return base * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(x * 0.07)));
    }
  }
  function drawSignal(ctx, w, h, m, fx) {
    const pad = 10, cy = h / 2, L = w - pad * 2;
    ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(w - pad, cy); ctx.strokeStyle = '#2A2F3B'; ctx.lineWidth = 1; ctx.stroke();
    if (!m.gs.length) return;
    const n = m.gs.length, segW = L / n;
    const cr = fx.I > 0 ? fx.rnd : rng(m.seed ^ 13);
    const step = 2, N = Math.ceil(L / step), H = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = i * step, pos = u * n - 0.5;
      const a = Math.max(0, Math.min(n - 1, Math.floor(pos))), b = Math.min(n - 1, a + 1);
      let f = Math.max(0, Math.min(1, pos - a)); f = f * f * (3 - 2 * f);
      const va = waveAt(m.gs[a].k, x, m.gs[a], cr), vb = waveAt(m.gs[b].k, x, m.gs[b], cr);
      const env = Math.pow(Math.sin(Math.PI * u), 0.5);
      H.push((va + (vb - va) * f) * h * 0.44 * env * (1 + fx.I * 0.12 * (cr() * 2 - 1)));
    }
    const grad = ctx.createLinearGradient(pad, 0, w - pad, 0);
    m.gs.forEach((g, i) => grad.addColorStop(Math.min(1, (i + 0.5) / n), rgba(hue(g.w), 1)));
    const outline = sign => { ctx.beginPath(); H.forEach((v, i) => { const x = pad + i * step, y = cy + sign * v; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
    // body
    ctx.beginPath();
    H.forEach((v, i) => { const x = pad + i * step; i ? ctx.lineTo(x, cy - v) : ctx.moveTo(x, cy - v); });
    for (let i = H.length - 1; i >= 0; i--) ctx.lineTo(pad + i * step, cy + H[i]);
    ctx.closePath(); ctx.fillStyle = grad; ctx.globalAlpha = 0.2 + 0.1 * fx.I; ctx.fill(); ctx.globalAlpha = 1;
    // edges and centre current
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) { outline(s); ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 0.15 + 0.2 * fx.I; ctx.lineWidth = 6; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(w - pad, cy); ctx.strokeStyle = rgba(HOT, 0.35 + 0.5 * fx.I); ctx.lineWidth = 1; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // section boundaries
    for (let i = 1; i < n; i++) { const x = pad + i * segW; ctx.beginPath(); ctx.moveTo(x, cy - 3); ctx.lineTo(x, cy + 3); ctx.strokeStyle = 'rgba(241,243,247,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
  }

  const DRAW = { map: drawMap, helix: drawHelix, signal: drawSignal };

  /* ---------- mounting and animation ---------- */
  const states = new Map();
  const played = new Set();
  let raf = 0;
  let source = () => ({ genres: [], artists: [] });
  const sig = s => s.genres.join('|') + '#' + s.artists.join('|');

  function setup(st) {
    const r = st.c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(60, Math.round(r.width)), h = +st.c.dataset.h || 200;
    if (st.w === w && st.h === h && st.dpr === dpr) return false;
    st.w = w; st.h = h; st.dpr = dpr;
    st.c.width = Math.round(w * dpr); st.c.height = Math.round(h * dpr); st.c.style.height = h + 'px';
    return true;
  }
  function paint(st, I, prevAlpha) {
    const ctx = st.c.getContext('2d');
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, st.w, st.h);
    if (st.prev && prevAlpha > 0) { ctx.globalAlpha = prevAlpha; ctx.drawImage(st.prev, 0, 0, st.w, st.h); ctx.globalAlpha = 1; }
    ctx.globalAlpha = 1 - (prevAlpha || 0);
    DRAW[st.variant](ctx, st.w, st.h, st.model, { I, rnd: st.rnd });
    ctx.globalAlpha = 1;
  }
  function tick(now) {
    raf = 0; let any = false;
    for (const [c, st] of states) {
      if (!c.isConnected) { states.delete(c); if (st.ro) st.ro.disconnect(); continue; }
      if (st.start == null) continue;
      const t = now - st.start, dur = 1700;
      if (t >= dur && !LOOP) { st.start = null; st.prev = null; paint(st, 0, 0); continue; }
      const I = LOOP ? 0.18 + 0.12 * Math.sin(t / 400) : Math.exp(-t / 520) * Math.min(1, (dur - t) / 300);
      const pa = st.prev ? Math.max(0, 1 - t / 380) : 0;
      if (now - (st.lastF || 0) > 55) { st.lastF = now; st.frameSeed = (Math.random() * 1e9) | 0; }
      st.rnd = rng(st.frameSeed || 1);
      paint(st, I, pa); any = true;
    }
    if (any) raf = requestAnimationFrame(tick);
  }
  function charge(st) {
    if (mq.matches) { st.prev = null; paint(st, 0, 0); return; }
    st.start = performance.now(); if (!raf) raf = requestAnimationFrame(tick);
  }

  function mount(c) {
    if (states.has(c)) return;
    const variant = VARIANTS.includes(c.dataset.variant) ? c.dataset.variant : GR_DNA.variant;
    const key = (c.dataset.dna || 'dna') + ':' + variant;
    const src = c.dataset.genres != null ? { genres: c.dataset.genres ? c.dataset.genres.split('|') : [], artists: [] } : source();
    const st = { c, key, variant, src, sig: sig(src), model: model(src.genres, src.artists), start: null, rnd: Math.random };
    states.set(c, st);
    setup(st); paint(st, 0, 0);
    if (window.ResizeObserver) { st.ro = new ResizeObserver(() => { if (setup(st) && st.start == null) paint(st, 0, 0); }); st.ro.observe(c); }
    c.addEventListener('pointerdown', () => { if (st.start == null) charge(st); });
    if (!played.has(key) && src.genres.length) { played.add(key); charge(st); }
    if (LOOP) charge(st);
  }

  /* Call after picks change. Mounted pictures that follow the app's picks crossfade to the new shape. */
  function refresh() {
    const s = source(), k = sig(s);
    for (const st of states.values()) {
      if (st.c.dataset.genres != null || st.sig === k) continue;
      if (!mq.matches && st.c.width) { const off = document.createElement('canvas'); off.width = st.c.width; off.height = st.c.height; off.getContext('2d').drawImage(st.c, 0, 0); st.prev = off; }
      st.src = s; st.sig = k; st.model = model(s.genres, s.artists);
      charge(st);
    }
  }

  const v = P.get('dna');
  const GR_DNA = window.GR_DNA = {
    variant: VARIANTS.includes(v) ? v : 'helix',
    VARIANTS, NAMES, traits, summary, ring, hue,
    setSource(fn) { source = fn; },
    scan(root) { (root || document).querySelectorAll('canvas.dna').forEach(mount); },
    refresh,
    reset() { played.clear(); },
    zap() { for (const st of states.values()) if (st.start == null && st.model.gs.length) charge(st); }
  };
})();
