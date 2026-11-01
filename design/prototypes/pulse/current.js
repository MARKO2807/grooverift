/* GrooveRift refined prototype (step 3.5, direction C "Pulse"): the "struja" (electric current) motif.
   A Coral→Amber current drawn on <canvas>, after the electric contours of the Rift Pulse symbol.
   Two charges run in from the left (Coral) and the right (Amber), collide in the middle and the
   pulse beats while the line crackles. Then the line rests. Decorative only: every canvas is aria-hidden.

   Motion policy (WCAG 2.2.2 Pause, Stop, Hide; WCAG 2.3.3 Animation from Interactions):
   - A burst plays when a current first scrolls into view, and again on GR_CURRENT.zap() or a tap.
     Each burst lasts under 5 s, then the line rests completely still. Nothing runs while resting.
   - prefers-reduced-motion: reduce → only the resting line is drawn.
   - ?motion=loop keeps it running. Review only, to compare; shipping that needs a pause control.

   Markup: <canvas class="current" data-cur="unique-key" data-size="lg|md|sm" aria-hidden="true"></canvas>
   GR_CURRENT.scan(root) mounts every canvas.current. A key remembers that its intro already played,
   so re-renders of the same screen do not replay it. No dependencies. */
(function () {
  'use strict';
  const CORAL = [255, 88, 107], AMBER = [255, 203, 105], HOT = [255, 247, 238];
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const LOOP = new URLSearchParams(location.search).get('motion') === 'loop';
  const SIZE = { lg: { h: 60, amp: 1 }, md: { h: 40, amp: 0.75 }, sm: { h: 24, amp: 0.5 } };
  const INTRO = 4300, PULSE = 2600, LEAD = 460;
  /* Rest shape: the approved rift line from step 3.4/3.5 (polyline 0,7 132,7 146,2 156,12 166,1 176,11 186,7 320,7). */
  const SPIKE = [[0, 0], [0.4125, 0], [0.456, -0.714], [0.4875, 0.714], [0.519, -0.857], [0.55, 0.571], [0.581, 0], [1, 0]];
  const played = new Set();
  const states = new Map();
  let raf = 0;

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  function spikeAt(u) {
    for (let i = 1; i < SPIKE.length; i++) {
      const [u1, v1] = SPIKE[i]; const [u0, v0] = SPIKE[i - 1];
      if (u <= u1) return v0 + (v1 - v0) * ((u - u0) / ((u1 - u0) || 1));
    }
    return 0;
  }

  /* Draws a jagged "lightning" polyline between two points. Shared with dna.js. */
  function bolt(ctx, x1, y1, x2, y2, amp, rnd, step) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const n = Math.max(2, Math.round(len / (step || 7)));
    const nx = -dy / len, ny = dx / len;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) {
      const t = i / n, env = Math.sin(Math.PI * t);
      const o = (rnd() * 2 - 1) * amp * env;
      ctx.lineTo(x1 + dx * t + nx * o, y1 + dy * t + ny * o);
    }
    ctx.lineTo(x2, y2);
  }

  function setup(st) {
    const c = st.c, r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(40, Math.round(r.width)), h = SIZE[st.size].h;
    if (st.w === w && st.dpr === dpr) return;
    st.w = w; st.h = h; st.dpr = dpr;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.height = h + 'px';
    st.n = Math.max(24, Math.round(w / 3.2));
    const R = rng(st.seed);
    st.rest = Array.from({ length: st.n }, () => (R() * 2 - 1));
    st.noise = new Float32Array(st.n);
    st.noise2 = new Float32Array(st.n);
    st.coarse = new Float32Array(Math.ceil(st.n / 7) + 2);
  }

  function crackle(st, now) {
    if (now - st.lastFlick < st.flickMs) return;
    st.lastFlick = now; st.flickMs = 45 + st.rnd() * 45;
    for (let i = 0; i < st.coarse.length; i++) st.coarse[i] = st.coarse[i] * 0.3 + (st.rnd() * 2 - 1) * 0.7;
    for (let i = 0; i < st.n; i++) {
      const p = i / 7, k = Math.floor(p), f = p - k;
      const base = st.coarse[k] * (1 - f) + st.coarse[k + 1] * f;
      st.noise[i] = base * 0.75 + (st.rnd() * 2 - 1) * 0.25;
      st.noise2[i] = base * 0.4 + (st.rnd() * 2 - 1) * 0.6;
    }
    st.branch = st.rnd() < 0.45 ? { u: 0.3 + st.rnd() * 0.4, dir: st.rnd() < 0.5 ? -1 : 1, len: 0.05 + st.rnd() * 0.09, seed: st.rnd() * 1e9 } : null;
  }

  /* Intensity curve of a burst. Returns { lead (0..1 how far the charges have run), I (crackle),
     beat (spike multiplier), flash (collision glow) }. */
  function phase(st, t) {
    const intro = st.kind === 'intro';
    const dur = intro ? INTRO : PULSE;
    const t0 = intro ? LEAD : 0;
    if (t >= dur) return null;
    const lead = intro ? ease(t / LEAD) : 1;
    const tt = Math.max(0, t - t0);
    const tail = Math.min(1, (dur - t) / 700);
    let I = intro && t < LEAD ? 0.55 : (0.22 + 0.78 * Math.exp(-tt / 950));
    I *= tail;
    let beat = 1;
    const beats = intro ? [0, 1150, 2250] : [0, 1100];
    for (const b of beats) { const d = tt - b; if (d >= 0 && d < 520) beat += (d < 90 ? d / 90 : Math.exp(-(d - 90) / 140)) * (b === 0 ? 0.9 : 0.55); }
    if (intro && t < LEAD) beat = 0.4;
    let flash = intro ? (t >= LEAD ? Math.exp(-(t - LEAD) / 260) : 0) : Math.exp(-t / 300) * 0.6;
    /* Charges flow in from both ends and meet in the middle just as each later beat lands. */
    const sparks = [];
    for (const b of beats.slice(1)) { const s = (tt - (b - 480)) / 480; if (s >= 0 && s <= 1) sparks.push(ease(s)); const d = tt - b; if (d >= 0 && d < 400) flash = Math.max(flash, 0.7 * Math.exp(-d / 180)); }
    return { lead, I, beat, flash: flash * tail, sparks };
  }

  function draw(st, p) {
    const ctx = st.c.getContext('2d');
    const { w, h, dpr, n } = st;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cy = h / 2, amp = SIZE[st.size].amp;
    const spikeH = h * 0.36 * (p ? p.beat : 1);
    const I = p ? p.I : 0;
    const crackH = h * 0.2 * amp * I;
    const restH = h * 0.022;
    const xs = new Float32Array(n), ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), env = Math.pow(Math.sin(Math.PI * u), 0.7);
      xs[i] = u * w;
      ys[i] = cy + spikeAt(u) * spikeH + (st.rest[i] * restH + st.noise[i] * crackH) * env;
    }
    const ys2 = new Float32Array(n);
    if (I > 0.12) for (let i = 0; i < n; i++) { const u = i / (n - 1), env = Math.pow(Math.sin(Math.PI * u), 0.7); ys2[i] = cy + spikeAt(u) * spikeH * 0.92 + st.noise2[i] * crackH * 1.25 * env; }
    const lead = p ? p.lead : 1;
    const iL = Math.round(lead * 0.5 * (n - 1)), iR = (n - 1) - iL;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, rgba(CORAL, 1)); grad.addColorStop(1, rgba(AMBER, 1));
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(xs[0], ys[0]); for (let i = 1; i <= iL; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.moveTo(xs[n - 1], ys[n - 1]); for (let i = n - 2; i >= iR; i--) ctx.lineTo(xs[i], ys[i]);
    };
    ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    // outer glow
    path(); ctx.strokeStyle = grad; ctx.globalAlpha = 0.1 + 0.22 * I; ctx.lineWidth = 6 + 6 * I; ctx.stroke();
    // body
    ctx.globalAlpha = 1; path(); ctx.lineWidth = st.size === 'sm' ? 1.6 : 2; ctx.stroke();
    // a second, thinner filament while strongly charged, like the doubled contours of the symbol
    if (I > 0.12) {
      ctx.beginPath(); ctx.moveTo(xs[0], ys2[0]); for (let i = 1; i <= iL; i++) ctx.lineTo(xs[i], ys2[i]); ctx.moveTo(xs[n - 1], ys2[n - 1]); for (let i = n - 2; i >= iR; i--) ctx.lineTo(xs[i], ys2[i]);
      ctx.strokeStyle = grad; ctx.globalAlpha = Math.min(0.75, I * 0.85); ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // white-hot core while charged
    if (I > 0.04) { path(); ctx.strokeStyle = rgba(HOT, Math.min(0.7, I * 0.8)); ctx.lineWidth = 0.8; ctx.stroke(); }
    // flowing charges
    if (p && p.sparks.length) {
      for (const s of p.sparks) {
        for (const [u, col] of [[0.5 * s, CORAL], [1 - 0.5 * s, AMBER]]) {
          const i = Math.max(0, Math.min(n - 1, Math.round(u * (n - 1)))), r = h * 0.32;
          const g = ctx.createRadialGradient(xs[i], ys[i], 0, xs[i], ys[i], r);
          g.addColorStop(0, rgba(HOT, 0.9)); g.addColorStop(0.3, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g; ctx.fillRect(xs[i] - r, ys[i] - r, 2 * r, 2 * r);
          const j0 = Math.max(0, i - 6), j1 = Math.min(n - 1, i + 6);
          ctx.beginPath(); ctx.moveTo(xs[j0], ys[j0]); for (let j = j0 + 1; j <= j1; j++) ctx.lineTo(xs[j], ys[j]);
          ctx.strokeStyle = rgba(HOT, 0.85); ctx.lineWidth = 1.6; ctx.stroke();
        }
      }
    }
    // a short fork near the middle
    if (p && st.branch && I > 0.35) {
      const b = st.branch, i0 = Math.round(b.u * (n - 1));
      if (i0 <= iL || i0 >= iR) {
        const R = rng(b.seed);
        const x2 = xs[i0] + b.len * w * (b.u < 0.5 ? -0.6 : 0.6), y2 = ys[i0] + b.dir * h * 0.38 * amp;
        ctx.beginPath(); bolt(ctx, xs[i0], ys[i0], x2, y2, h * 0.07, R, 5);
        ctx.strokeStyle = rgba(mix(CORAL, AMBER, b.u), 0.55 * I); ctx.lineWidth = 1; ctx.stroke();
      }
    }
    // charge heads while running in
    if (p && lead < 1) {
      for (const [i, col] of [[iL, CORAL], [iR, AMBER]]) {
        const g = ctx.createRadialGradient(xs[i], ys[i], 0, xs[i], ys[i], h * 0.4);
        g.addColorStop(0, rgba(HOT, 0.95)); g.addColorStop(0.25, rgba(col, 0.6)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.globalAlpha = 1; ctx.fillRect(xs[i] - h, ys[i] - h, 2 * h, 2 * h);
      }
    }
    // collision flash
    if (p && p.flash > 0.02) {
      const x = w / 2, r = h * 0.9;
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, r);
      g.addColorStop(0, rgba(HOT, 0.75 * p.flash)); g.addColorStop(0.3, rgba(mix(CORAL, AMBER, 0.5), 0.35 * p.flash)); g.addColorStop(1, rgba(AMBER, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, cy - r, 2 * r, 2 * r);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function tick(now) {
    raf = 0;
    let any = false;
    for (const [c, st] of states) {
      if (!c.isConnected) { states.delete(c); if (st.ro) st.ro.disconnect(); if (st.io) st.io.disconnect(); continue; }
      if (st.start == null) continue;
      setup(st);
      const p = phase(st, now - st.start);
      if (!p) {
        st.start = null; st.noise.fill(0); draw(st, null);
        if (LOOP && !mq.matches) { st.kind = 'pulse'; st.loopAt = now + 900; }
        continue;
      }
      crackle(st, now); draw(st, p); any = true;
    }
    if (LOOP && !mq.matches) {
      for (const st of states.values()) if (st.start == null && st.loopAt && now >= st.loopAt) { st.loopAt = 0; st.start = now; any = true; }
      if (!any) for (const st of states.values()) if (st.loopAt) any = true;
    }
    if (any) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  function play(st, kind) {
    if (mq.matches) return;
    st.kind = kind; st.start = performance.now(); st.lastFlick = 0; kick();
  }

  function mount(c) {
    if (states.has(c)) return;
    const key = c.dataset.cur || 'cur';
    const st = { c, key, size: SIZE[c.dataset.size] ? c.dataset.size : 'md', seed: hash(key), start: null, lastFlick: 0, flickMs: 60 };
    st.rnd = rng(st.seed ^ 0x9e3779b9);
    states.set(c, st);
    setup(st); draw(st, null);
    if (window.ResizeObserver) { st.ro = new ResizeObserver(() => { const w = st.w; setup(st); if (st.w !== w && st.start == null) draw(st, null); }); st.ro.observe(c); }
    c.addEventListener('pointerdown', () => { if (st.start == null) play(st, 'pulse'); });
    if (played.has(key) && !LOOP) return;
    if (window.IntersectionObserver) {
      st.io = new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting)) { st.io.disconnect(); st.io = null; played.add(key); play(st, 'intro'); }
      }, { threshold: 0.6 });
      st.io.observe(c);
    } else { played.add(key); play(st, 'intro'); }
  }

  window.GR_CURRENT = {
    scan(root) { (root || document).querySelectorAll('canvas.current').forEach(mount); },
    /* Replays a short pulse (under 3 s) after a user action. */
    zap(key) { for (const st of states.values()) if (!key || st.key === key) { if (st.start == null) play(st, 'pulse'); } },
    /* Lets intros play again; app.js calls it when the member navigates to another screen. */
    reset() { played.clear(); },
    reduced: () => mq.matches,
    loop: LOOP,
    bolt, rng, hash, mix, rgba, CORAL, AMBER, HOT
  };
})();
