/* GrooveRift refined prototype (step 3.5, direction C "Pulse"): the "struja" (electric current) motif.
   Round 2 (session 9). A Coral→Amber arc drawn on <canvas>, after the electric contours of the Rift
   Pulse symbol. It flows smoothly and stays alive: charges travel in from both ends and discharge in
   the middle, where the arc pulses. On arrival the two halves run in and collide.
   The same file draws the "orbit": a small charge that circles the answer field in the dock.
   Decorative only: every canvas is aria-hidden.

   Motion policy (owner decision, session 9): motifs stay alive after their intro. "Smanji pokrete"
   (app setting, GR_MOTION.setCalm) or the OS setting prefers-reduced-motion stops all motif motion and
   leaves a still frame. This global setting is the pause mechanism for WCAG 2.2.2.
   Frames are drawn only while a canvas is on screen and the tab is visible.
   Markup: <canvas class="current" data-cur="key" data-size="lg|md|sm"></canvas>
           <canvas class="orbit"></canvas> as the first child of a pill-shaped button. No dependencies. */
(function () {
  'use strict';
  const CORAL = [255, 88, 107], AMBER = [255, 203, 105], HOT = [255, 247, 238];
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const P = new URLSearchParams(location.search);
  const SIZE = { lg: { h: 64, amp: 1 }, md: { h: 44, amp: 0.8 }, sm: { h: 26, amp: 0.55 } };
  const LEAD = 520;
  const listeners = [];
  let calm = P.get('calm') === '1';
  const reduced = () => calm || mq.matches;
  function applyMotion() { document.documentElement.dataset.motion = reduced() ? 'reduced' : 'full'; listeners.forEach(f => f()); }
  window.GR_MOTION = { reduced, calm: () => calm, setCalm(v) { calm = !!v; applyMotion(); }, onChange(f) { listeners.push(f); } };
  if (mq.addEventListener) mq.addEventListener('change', applyMotion);
  document.documentElement.dataset.motion = reduced() ? 'reduced' : 'full';

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  /* Smooth 1D value noise in [-1, 1]. */
  function noise(seed) {
    const R = rng(seed), T = new Float32Array(256);
    for (let i = 0; i < 256; i++) T[i] = R() * 2 - 1;
    return x => { const i = Math.floor(x), f = x - i, a = T[i & 255], b = T[(i + 1) & 255]; return a + (b - a) * f * f * (3 - 2 * f); };
  }
  /* A jagged "lightning" polyline between two points. Shared with dna.js. */
  function bolt(ctx, x1, y1, x2, y2, amp, rnd, step) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const n = Math.max(2, Math.round(len / (step || 7)));
    const nx = -dy / len, ny = dx / len;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) { const t = i / n; const o = (rnd() * 2 - 1) * amp * Math.sin(Math.PI * t); ctx.lineTo(x1 + dx * t + nx * o, y1 + dy * t + ny * o); }
    ctx.lineTo(x2, y2);
  }

  const states = new Map();
  const played = new Set();
  let raf = 0;

  function measure(st) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;
    if (st.kind === 'orbit') { const b = st.c.parentElement; st.bw = b.offsetWidth; st.bh = b.offsetHeight; w = st.bw + 16; h = st.bh + 16; }
    else { w = Math.max(40, Math.round(st.c.getBoundingClientRect().width)); h = SIZE[st.size].h; }
    if (st.w === w && st.h === h && st.dpr === dpr) return false;
    st.w = w; st.h = h; st.dpr = dpr;
    st.c.width = Math.round(w * dpr); st.c.height = Math.round(h * dpr);
    if (st.kind === 'orbit') st.c.style.width = w + 'px';
    st.c.style.height = h + 'px';
    if (st.kind === 'current') st.n = Math.max(32, Math.round(w / 2.5));
    return true;
  }

  /* ---------- the current ---------- */
  function arcs(st, now, k) {
    for (let i = 0; i < k; i++) st.arcs.push({ born: now, seed: (st.rnd() * 1e9) | 0, dx: (st.rnd() * 2 - 1) * 0.14, dy: (st.rnd() < 0.5 ? -1 : 1) * (0.22 + st.rnd() * 0.22) });
  }
  function drawCurrent(st, now) {
    const ctx = st.c.getContext('2d');
    const { w, h, dpr, n } = st;
    const t = now / 1000, still = reduced();
    const dt = Math.min(0.05, Math.max(0, (now - (st.lastNow || now)) / 1000)); st.lastNow = now;
    const it = st.intro == null ? 1e9 : now - st.intro;
    const lead = still ? 1 : (it < LEAD ? ease(it / LEAD) : 1);
    if (!still && it >= LEAD && !st.collided) { st.collided = true; st.surge = 1.5; arcs(st, now, 4); }
    const I = still ? 0.3 : 0.32 + (it >= LEAD ? 0.6 * Math.exp(-(it - LEAD) / 1100) : 0.3);
    st.surge = still ? 0 : (st.surge || 0) * Math.exp(-dt / 0.24);
    // charges: a pair runs in from both ends every 1.1 to 2.1 s and discharges in the middle
    if (!still && lead >= 1) {
      if (!st.nextSpawn || now >= st.nextSpawn) { const sp = 0.32 + st.rnd() * 0.14; st.packets.push({ u: 0, sp, side: -1 }, { u: 0, sp: sp * (0.92 + st.rnd() * 0.16), side: 1 }); st.nextSpawn = now + 1100 + st.rnd() * 1000; }
      for (const p of st.packets) p.u += p.sp * dt;
      if (st.packets.some(p => p.u >= 0.5)) { st.surge = Math.max(st.surge, 1); arcs(st, now, 2 + Math.round(st.rnd() * 2)); }
      st.packets = st.packets.filter(p => p.u < 0.5);
    }
    if (still) { st.packets = []; st.arcs = []; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cy = h / 2, amp = SIZE[st.size].amp;
    const A = h * amp * (0.07 + 0.05 * I + 0.17 * st.surge);
    const ts = still ? st.stillT : t;
    const xs = new Float32Array(n), ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), env = Math.pow(Math.sin(Math.PI * u), 0.85);
      xs[i] = u * w;
      ys[i] = cy + env * A * (st.n1(u * 3.1 + ts * 0.55) + 0.5 * st.n2(u * 9.5 - ts * 1.7) + 0.24 * st.n3(u * 26 + ts * 4.3));
    }
    const iL = Math.round(lead * 0.5 * (n - 1)), iR = (n - 1) - iL;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(xs[0], ys[0]); for (let i = 1; i <= iL; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.moveTo(xs[n - 1], ys[n - 1]); for (let i = n - 2; i >= iR; i--) ctx.lineTo(xs[i], ys[i]);
    };
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, rgba(CORAL, 1)); grad.addColorStop(1, rgba(AMBER, 1));
    const hot = ctx.createLinearGradient(0, 0, w, 0);
    hot.addColorStop(0, rgba(HOT, 0)); hot.addColorStop(0.5, rgba(HOT, 0.55 + 0.4 * Math.min(1, I + st.surge * 0.5))); hot.addColorStop(1, rgba(HOT, 0));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    // centre glow where the two sides meet
    { const r = h * 0.48, sx = 1.6 + 1.2 * Math.min(1, st.surge);
      ctx.save(); ctx.translate(w / 2, cy); ctx.scale(sx, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, rgba(mix(CORAL, AMBER, 0.5), 0.14 + 0.38 * Math.min(1.2, st.surge))); g.addColorStop(1, rgba(AMBER, 0));
      ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore(); }
    // bloom, body and white-hot centre
    path(); ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.05 + 0.05 * I; ctx.lineWidth = 13; ctx.stroke();
    ctx.globalAlpha = 0.1 + 0.12 * I; ctx.lineWidth = 6; ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.lineWidth = 2.8; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = st.size === 'sm' ? 1.3 : 1.5; ctx.stroke();
    ctx.strokeStyle = hot; ctx.lineWidth = 0.8; ctx.stroke();
    // travelling charges with a fading tail
    for (const p of st.packets) {
      const head = p.side < 0 ? p.u : 1 - p.u, tail = p.side < 0 ? Math.max(0, p.u - 0.11) : Math.min(1, 1 - p.u + 0.11);
      const ih = Math.round(head * (n - 1)), itl = Math.round(tail * (n - 1));
      const a = Math.min(ih, itl), b = Math.max(ih, itl);
      const col = p.side < 0 ? CORAL : AMBER;
      if (b > a) {
        const g = ctx.createLinearGradient(xs[itl], 0, xs[ih], 0);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(mix(col, HOT, 0.6), 0.95));
        ctx.beginPath(); ctx.moveTo(xs[a], ys[a]); for (let i = a + 1; i <= b; i++) ctx.lineTo(xs[i], ys[i]);
        ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.stroke();
      }
      const r = h * 0.2, rg = ctx.createRadialGradient(xs[ih], ys[ih], 0, xs[ih], ys[ih], r);
      rg.addColorStop(0, rgba(HOT, 0.9)); rg.addColorStop(0.35, rgba(col, 0.45)); rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg; ctx.fillRect(xs[ih] - r, ys[ih] - r, 2 * r, 2 * r);
    }
    // the two halves running in on arrival
    if (lead < 1) for (const [i, col] of [[iL, CORAL], [iR, AMBER]]) {
      const r = h * 0.42, g = ctx.createRadialGradient(xs[i], ys[i], 0, xs[i], ys[i], r);
      g.addColorStop(0, rgba(HOT, 0.95)); g.addColorStop(0.25, rgba(col, 0.6)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(xs[i] - r, ys[i] - r, 2 * r, 2 * r);
    }
    // discharge arcs from the middle
    st.arcs = st.arcs.filter(a => now - a.born < 200);
    for (const a of st.arcs) {
      const life = 1 - (now - a.born) / 200, R = rng(a.seed ^ Math.floor(now / 40));
      const x0 = w / 2, y0 = ys[Math.round((n - 1) / 2)];
      ctx.beginPath(); bolt(ctx, x0, y0, x0 + a.dx * w, y0 + a.dy * h, h * 0.06, R, 4);
      ctx.strokeStyle = rgba(mix(CORAL, AMBER, 0.5 + a.dx * 3), 0.85 * life); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- the orbit round the answer field ---------- */
  function perimeterPoint(st, s) {
    const pad = 8, w = st.bw, h = st.bh, r = h / 2, L = Math.max(0, w - 2 * r), P = 2 * L + 2 * Math.PI * r;
    s = ((s % P) + P) % P;
    if (s < L) return [pad + r + s, pad + 0.5];
    s -= L;
    if (s < Math.PI * r) { const a = -Math.PI / 2 + s / r; return [pad + w - r + (r - 0.5) * Math.cos(a), pad + r + (r - 0.5) * Math.sin(a)]; }
    s -= Math.PI * r;
    if (s < L) return [pad + w - r - s, pad + h - 0.5];
    s -= L;
    const a = Math.PI / 2 + s / r; return [pad + r + (r - 0.5) * Math.cos(a), pad + r + (r - 0.5) * Math.sin(a)];
  }
  function drawOrbit(st, now) {
    const ctx = st.c.getContext('2d');
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, st.w, st.h);
    if (!st.bw || !st.bh) return;
    const r = st.bh / 2, L = Math.max(0, st.bw - 2 * r), Pm = 2 * L + 2 * Math.PI * r;
    if (reduced()) {
      ctx.beginPath(); for (let i = 0; i <= 80; i++) { const [x, y] = perimeterPoint(st, Pm * i / 80); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      const g = ctx.createLinearGradient(0, 0, st.w, 0); g.addColorStop(0, rgba(CORAL, 0.7)); g.addColorStop(1, rgba(AMBER, 0.7));
      ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.stroke(); return;
    }
    const it = st.intro == null ? 1e9 : now - st.intro, boost = it < 2600 ? 1 : 0.7;
    const head = (now / 4200) * Pm, tail = Pm * 0.26, K = 30;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let k = 0; k < K; k++) {
      const s0 = head - tail * (1 - k / K), s1 = head - tail * (1 - (k + 1) / K);
      const [x0, y0] = perimeterPoint(st, s0), [x1, y1] = perimeterPoint(st, s1);
      const f = (k + 1) / K, col = mix(CORAL, AMBER, f);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.strokeStyle = rgba(col, f * f * 0.9 * boost); ctx.lineWidth = 0.8 + 1.6 * f; ctx.stroke();
      ctx.strokeStyle = rgba(col, f * f * 0.18 * boost); ctx.lineWidth = 6 * f; ctx.stroke();
    }
    const [hx, hy] = perimeterPoint(st, head), g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 8);
    g.addColorStop(0, rgba(HOT, 0.95 * boost)); g.addColorStop(0.4, rgba(AMBER, 0.5 * boost)); g.addColorStop(1, rgba(AMBER, 0));
    ctx.fillStyle = g; ctx.fillRect(hx - 8, hy - 8, 16, 16);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- loop ---------- */
  function draw(st, now) { if (st.kind === 'orbit') drawOrbit(st, now); else drawCurrent(st, now); }
  function drop(c, st) { states.delete(c); if (st.ro) st.ro.disconnect(); if (st.io) st.io.disconnect(); }
  function tick(now) {
    raf = 0;
    if (document.hidden || reduced()) return;
    let any = false;
    for (const [c, st] of states) {
      if (!c.isConnected) { drop(c, st); continue; }
      if (!st.visible) continue;
      draw(st, now); any = true;
    }
    if (any) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf && !reduced()) raf = requestAnimationFrame(tick); };

  function zapState(st) {
    if (st.kind !== 'current' || reduced()) return;
    st.surge = 1.4; arcs(st, performance.now(), 3);
    st.packets.push({ u: 0.1, sp: 0.5, side: -1 }, { u: 0.1, sp: 0.5, side: 1 });
    kick();
  }
  function mount(c, kind) {
    if (states.has(c)) return;
    const key = c.dataset.cur || kind;
    const st = { c, kind, key, size: SIZE[c.dataset.size] ? c.dataset.size : 'md', seed: hash(key), packets: [], arcs: [], visible: false };
    st.rnd = rng(st.seed ^ 0x9e3779b9);
    st.n1 = noise(st.seed); st.n2 = noise(st.seed ^ 0x51ed); st.n3 = noise(st.seed ^ 0xa3c5);
    st.stillT = (st.seed % 1000) / 37;
    states.set(c, st);
    measure(st);
    if (!played.has(key)) { played.add(key); st.intro = performance.now(); } else st.collided = true;
    draw(st, performance.now());
    if (window.ResizeObserver) { st.ro = new ResizeObserver(() => { if (measure(st)) draw(st, performance.now()); }); st.ro.observe(kind === 'orbit' ? c.parentElement : c); }
    if (kind === 'current') c.addEventListener('pointerdown', () => zapState(st));
    if (window.IntersectionObserver) {
      st.io = new IntersectionObserver(es => { st.visible = es.some(e => e.isIntersecting); if (st.visible) kick(); }, { threshold: 0.05 });
      st.io.observe(c);
    } else { st.visible = true; kick(); }
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  listeners.push(() => { const now = performance.now(); for (const st of states.values()) draw(st, now); kick(); });

  window.GR_CURRENT = {
    scan(root) {
      (root || document).querySelectorAll('canvas.current').forEach(c => mount(c, 'current'));
      (root || document).querySelectorAll('canvas.orbit').forEach(c => mount(c, 'orbit'));
    },
    /* A short extra discharge after a member action (posting, tapping). */
    zap(key) { for (const st of states.values()) if (!key || st.key === key) zapState(st); },
    /* Lets intros play again; app.js calls it when the member moves to another screen. */
    reset() { played.clear(); },
    bolt, rng, hash, mix, rgba, noise, ease, CORAL, AMBER, HOT
  };
})();
