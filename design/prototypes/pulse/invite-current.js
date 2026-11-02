/* GrooveRift decision sketch (D-057): new invite currents. The owner wants taller, spiked electric impulses
   that clearly show two sides joining. Four variants on one canvas engine, compared with today's current.
   Reuses the helpers and the motion flag from current.js (GR_CURRENT, GR_MOTION). Decorative: aria-hidden.
   Markup: <canvas class="ic" data-v="spikes|arc|beat|branch" data-key="..."></canvas>
   Motion: with "Smanji pokrete" or the OS setting, each variant draws one still frame that already shows
   the two sides joined. Frames are drawn only while a canvas is on screen and the tab is visible. */
(function () {
  'use strict';
  const C = window.GR_CURRENT, M = window.GR_MOTION;
  const { rng, hash, mix, rgba, noise, ease, CORAL, AMBER, HOT } = C;
  const H = 112, LEAD = 520, TRAVEL = 760;
  const states = new Map();
  let raf = 0;

  const tri = (d, half) => Math.max(0, 1 - Math.abs(d) / half);
  const clampY = (y, h) => Math.max(3, Math.min(h - 3, y));
  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(HOT, a)); g.addColorStop(0.3, rgba(col, a * 0.5)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  /* The layered stroke used by the app's current: bloom, body and a white-hot core in the middle. */
  function layered(ctx, w, I, path) {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, rgba(CORAL, 1)); grad.addColorStop(1, rgba(AMBER, 1));
    const hot = ctx.createLinearGradient(0, 0, w, 0);
    hot.addColorStop(0, rgba(HOT, 0)); hot.addColorStop(0.5, rgba(HOT, 0.5 + 0.45 * Math.min(1, I))); hot.addColorStop(1, rgba(HOT, 0));
    ctx.lineJoin = 'miter'; ctx.miterLimit = 6; ctx.lineCap = 'round';
    path(); ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.04 + 0.05 * I; ctx.lineWidth = 12; ctx.stroke();
    ctx.globalAlpha = 0.1 + 0.12 * I; ctx.lineWidth = 5; ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = hot; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------- the four variants ----------
     Each has: shape(st, T, xs, ys) adds displacement to the calm base line; extra(st, T, ctx, xs, ys) draws glows
     and arcs; still(st) returns the event age (ms) for the still frame. Events: st.ev = { born, seed, big }. */
  const V = {
    /* I1: each side sends a short train of tall spikes; they meet and add up into one tall spike. */
    spikes: {
      shape(st, T, xs, ys) {
        const { w, h } = st, xc = w / 2, Hp = h * 0.24;
        for (const p of st.packets) {
          const hx = p.side < 0 ? p.u * xc : w - p.u * xc, dir = -p.side; // dir: direction of travel
          const R = rng(p.seed ^ Math.floor(T / 50));
          const amps = [-1, 0.75, -0.45, 0.22];
          for (let i = 0; i < xs.length; i++) {
            let d = 0;
            for (let k = 0; k < amps.length; k++) d += amps[k] * tri(xs[i] - (hx - dir * k * 7), 3.5);
            ys[i] += d * Hp * (0.85 + 0.3 * R()) * Math.min(1, p.u * 3);
          }
        }
        if (!st.ev) return;
        const a = T - st.ev.born, k = st.ev.big * Math.exp(-a / 300);
        if (k < 0.01) return;
        const R = rng(st.ev.seed ^ Math.floor(T / 35));
        for (let i = 0; i < xs.length; i++) {
          const d = xs[i] - xc;
          ys[i] += k * h * (-0.44 * tri(d, 5) + 0.3 * tri(d - 8, 4.5) + 0.08 * tri(d + 7, 3) - 0.12 * tri(d - 17, 4));
          if (Math.abs(d) < 34) ys[i] += (R() * 2 - 1) * h * 0.05 * k * (1 - Math.abs(d) / 34);
        }
      },
      extra(st, T, ctx, xs, ys) {
        for (const p of st.packets) { const i = Math.round((p.side < 0 ? p.u * 0.5 : 1 - p.u * 0.5) * (xs.length - 1)); glow(ctx, xs[i], ys[i], st.h * 0.2, p.side < 0 ? CORAL : AMBER, 0.75); }
        if (!st.ev) return;
        const k = st.ev.big * Math.exp(-(T - st.ev.born) / 260);
        if (k > 0.02) glow(ctx, st.w / 2, st.h / 2, st.h * (0.35 + 0.25 * k), mix(CORAL, AMBER, 0.5), Math.min(0.9, 0.55 * k));
      },
      still: () => 70
    },

    /* I2: a gap (the rift) splits the line; charges gather at the two ends and an arc jumps across. After the
       flash a thin crackling bridge stays, so the two sides read as connected. */
    arc: {
      gap: st => Math.max(22, st.w * 0.12),
      /* A bowed, jagged arc from (x1, y1) to (x2, y2): bow > 0 bends upwards. */
      bow(ctx, x1, y1, x2, y2, bow, jit, R) {
        const n = Math.max(8, Math.round(Math.hypot(x2 - x1, y2 - y1) / 4));
        ctx.moveTo(x1, y1);
        for (let i = 1; i < n; i++) {
          const t = i / n, s = Math.sin(Math.PI * t);
          ctx.lineTo(x1 + (x2 - x1) * t + (R() * 2 - 1) * jit * 0.4, y1 + (y2 - y1) * t - bow * s + (R() * 2 - 1) * jit * s);
        }
        ctx.lineTo(x2, y2);
      },
      shape() {},
      extra(st, T, ctx, xs, ys, still) {
        const { w, h } = st, xc = w / 2, g = this.gap(st), n = xs.length;
        const iL = Math.round(((xc - g) / w) * (n - 1)), iR = Math.round(((xc + g) / w) * (n - 1));
        const xl = xs[iL], yl = ys[iL], xr = xs[iR], yr = ys[iR];
        const charge = st.packets.reduce((m, p) => Math.max(m, p.u), 0);
        const a = st.ev ? T - st.ev.born : 1e9, k = st.ev ? st.ev.big * Math.exp(-a / 240) : 0;
        // bridge: bright strands during the flash, then a thin living crackle
        const strands = k > 0.15 ? 3 : 1, slot = Math.floor(T / (k > 0.15 ? 40 : 90));
        for (let s = 0; s < strands; s++) {
          const R = rng((st.ev ? st.ev.seed : st.seed) ^ (slot * 31 + s * 7));
          const kk = still ? 0.55 : Math.min(1, k);
          const bowH = h * (0.08 + 0.3 * kk) * [1, -0.75, 0.45][s], jit = h * (0.025 + 0.05 * kk);
          const alpha = still ? 0.95 : Math.min(1, 0.32 + 0.9 * k) * (s ? 0.55 : 1) * (k < 0.15 ? (R() < 0.12 ? 0.25 : 1) : 1);
          ctx.beginPath(); this.bow(ctx, xl, yl, xr, yr, bowH, jit, R);
          ctx.strokeStyle = rgba(mix(CORAL, AMBER, 0.5), alpha * 0.25); ctx.lineWidth = 5; ctx.stroke();
          ctx.strokeStyle = rgba(mix(HOT, AMBER, 0.35), alpha); ctx.lineWidth = s ? 0.8 : 1.3; ctx.stroke();
          if (!s && (k > 0.3 || still)) { // a few short branches off the main arc
            for (let b = 0; b < 3; b++) {
              const t = 0.25 + R() * 0.5, bx = xl + (xr - xl) * t, by = yl + (yr - yl) * t - bowH * Math.sin(Math.PI * t);
              ctx.beginPath(); C.bolt(ctx, bx, by, bx + (R() * 2 - 1) * g * 0.7, by + (R() < 0.5 ? -1 : 1) * h * (0.14 + R() * 0.16), h * 0.04, R, 3);
              ctx.strokeStyle = rgba(HOT, 0.55 * (still ? 1 : Math.min(1, k))); ctx.lineWidth = 0.7; ctx.stroke();
            }
          }
        }
        glow(ctx, xl, yl, h * (0.16 + 0.12 * charge + 0.2 * k), CORAL, Math.min(0.95, 0.45 + 0.4 * charge + 0.5 * k));
        glow(ctx, xr, yr, h * (0.16 + 0.12 * charge + 0.2 * k), AMBER, Math.min(0.95, 0.45 + 0.4 * charge + 0.5 * k));
        if (k > 0.05) glow(ctx, xc, (yl + yr) / 2, h * 0.55 * Math.min(1.2, k), mix(CORAL, AMBER, 0.5), 0.45 * Math.min(1, k));
        for (const p of st.packets) { const x = p.side < 0 ? p.u * (xc - g) : w - p.u * (xc - g), i = Math.round((x / w) * (n - 1)); glow(ctx, xs[i], ys[i], h * 0.13, p.side < 0 ? CORAL : AMBER, 0.7); }
      },
      clip: (st, i, n) => { const x = (i / (n - 1)) * st.w, g = V.arc.gap(st); return Math.abs(x - st.w / 2) < g; },
      still: () => 260
    },

    /* I3: a heartbeat. The meeting gives a double spike (lub-dub) in the middle and the beat then runs out to
       both ends along the joined line. */
    beat: {
      shape(st, T, xs, ys) {
        const { w, h } = st, xc = w / 2;
        for (const p of st.packets) {
          const hx = p.side < 0 ? p.u * xc : w - p.u * xc;
          for (let i = 0; i < xs.length; i++) ys[i] -= tri(xs[i] - hx, 5) * h * 0.12 * Math.min(1, p.u * 3);
        }
        if (!st.ev) return;
        const a = T - st.ev.born, b = st.ev.big;
        const lub = a >= 0 ? b * Math.exp(-a / 220) : 0, dub = a >= 170 ? b * 0.75 * Math.exp(-(a - 170) / 220) : 0;
        const run = a >= 220 ? (a - 220) / 650 : -1, wave = run >= 0 && run <= 1 ? b * 0.6 * (1 - run) : 0;
        for (let i = 0; i < xs.length; i++) {
          const d = xs[i] - xc;
          ys[i] += h * (lub * (-0.45 * tri(d + 4, 4) + 0.22 * tri(d - 4, 4)) + dub * (-0.36 * tri(d - 12, 3.5) + 0.16 * tri(d - 18, 3.5)));
          if (wave) { const r = run * (xc - 6); ys[i] -= h * 0.22 * wave * (tri(d - r, 5) + tri(d + r, 5)); }
        }
      },
      extra(st, T, ctx, xs, ys) {
        const { w, h } = st, xc = w / 2;
        for (const p of st.packets) { const i = Math.round((p.side < 0 ? p.u * 0.5 : 1 - p.u * 0.5) * (xs.length - 1)); glow(ctx, xs[i], ys[i], h * 0.16, p.side < 0 ? CORAL : AMBER, 0.75); }
        if (!st.ev) return;
        const a = T - st.ev.born, b = st.ev.big;
        const k = b * (Math.exp(-Math.max(0, a) / 200) + (a >= 170 ? 0.7 * Math.exp(-(a - 170) / 200) : 0));
        if (k > 0.02) glow(ctx, xc, h / 2, h * 0.45, mix(CORAL, AMBER, 0.5), Math.min(0.85, 0.5 * k));
        const run = a >= 220 ? (a - 220) / 650 : -1;
        if (run >= 0 && run <= 1) {
          const r = run * (xc - 6), f = 0.7 * b * (1 - run);
          const i1 = Math.round(((xc - r) / w) * (xs.length - 1)), i2 = Math.round(((xc + r) / w) * (xs.length - 1));
          glow(ctx, xs[i1], ys[i1], h * 0.14, CORAL, f); glow(ctx, xs[i2], ys[i2], h * 0.14, AMBER, f);
        }
      },
      still: () => 200
    },

    /* I4: at the meeting a tall branching discharge flashes up and down from the joint (twice, like real
       lightning), and the line itself kinks sharply there. */
    branch: {
      tree(st) {
        if (st.ev.tree) return st.ev.tree;
        const R = rng(st.ev.seed), { w, h } = st, segs = [];
        function grow(x, y, ang, len, depth) {
          let px = x, py = y;
          const steps = Math.max(3, Math.round(len / 6));
          for (let s = 0; s < steps; s++) {
            ang += (R() * 2 - 1) * 0.55;
            const nx = px + Math.cos(ang) * len / steps, ny = py + Math.sin(ang) * len / steps;
            segs.push([px, py, nx, ny, depth]);
            if (depth < 2 && R() < 0.3) grow(nx, ny, ang + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.5), len * (0.35 + R() * 0.2), depth + 1);
            px = nx; py = ny;
          }
        }
        const x0 = w / 2, y0 = h / 2;
        grow(x0, y0, -Math.PI / 2 + (R() * 2 - 1) * 0.35, h * 0.47, 0);
        grow(x0, y0, Math.PI / 2 + (R() * 2 - 1) * 0.35, h * 0.47, 0);
        return (st.ev.tree = segs);
      },
      shape(st, T, xs, ys) {
        const { w, h } = st, xc = w / 2;
        for (const p of st.packets) {
          const hx = p.side < 0 ? p.u * xc : w - p.u * xc, R = rng(p.seed ^ Math.floor(T / 45));
          for (let i = 0; i < xs.length; i++) { const t = tri(xs[i] - hx, 14); if (t) ys[i] += (R() * 2 - 1) * h * 0.14 * t; }
        }
        if (!st.ev) return;
        const k = st.ev.big * Math.exp(-(T - st.ev.born) / 280);
        for (let i = 0; i < xs.length; i++) { const d = xs[i] - xc; ys[i] += k * h * (-0.2 * tri(d + 3, 4) + 0.2 * tri(d - 3, 4)); }
      },
      extra(st, T, ctx, xs, ys, still) {
        const { w, h } = st;
        for (const p of st.packets) { const i = Math.round((p.side < 0 ? p.u * 0.5 : 1 - p.u * 0.5) * (xs.length - 1)); glow(ctx, xs[i], ys[i], h * 0.16, p.side < 0 ? CORAL : AMBER, 0.8); }
        if (!st.ev) return;
        const a = T - st.ev.born;
        // two flashes: 0–90 ms, dark 90–130 ms, 130–330 ms fading
        const vis = still ? 0.9 : a < 90 ? 1 : a < 130 ? 0.08 : a < 330 ? 0.95 * (1 - (a - 130) / 200) : 0;
        if (vis <= 0.01) return;
        const big = Math.min(1.3, st.ev.big), J = rng(st.ev.seed ^ Math.floor(T / 30));
        glow(ctx, w / 2, h / 2, h * 0.5, mix(CORAL, AMBER, 0.5), 0.5 * vis * big);
        for (const [x1, y1, x2, y2, d] of this.tree(st)) {
          const jx = still ? 0 : (J() * 2 - 1) * 0.8;
          const col = mix(y2 < h / 2 ? AMBER : CORAL, HOT, 0.45 - d * 0.15);
          ctx.beginPath(); ctx.moveTo(x1 + jx, y1); ctx.lineTo(x2 + jx, y2);
          ctx.strokeStyle = rgba(col, vis * 0.22 / (d + 1)); ctx.lineWidth = 5 - d * 1.5; ctx.stroke();
          ctx.strokeStyle = rgba(col, vis * (1 - d * 0.28)); ctx.lineWidth = 1.3 - d * 0.35; ctx.stroke();
        }
      },
      still: () => 40
    }
  };

  /* ---------- engine ---------- */
  function measure(st) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(80, Math.round(st.c.getBoundingClientRect().width)), h = H;
    if (st.w === w && st.dpr === dpr) return;
    st.w = w; st.h = h; st.dpr = dpr;
    st.c.width = Math.round(w * dpr); st.c.height = Math.round(h * dpr); st.c.style.height = h + 'px';
    st.n = Math.max(80, Math.round(w / 1.2));
  }
  function event(st, T, big) { st.ev = { born: T, seed: (st.rnd() * 1e9) | 0, big }; }
  function step(st, now, dt) {
    const it = now - st.intro;
    if (it >= LEAD && !st.arrived) { st.arrived = true; event(st, now, 1.5); st.next = now + 900; }
    if (!st.arrived) return;
    if (now >= st.next) {
      const seed = (st.rnd() * 1e9) | 0;
      st.packets.push({ u: 0, side: -1, seed }, { u: 0, side: 1, seed: seed ^ 0x5bd1 });
      st.next = now + TRAVEL + (st.v === 'beat' ? 700 : 900) + st.rnd() * 700;
    }
    for (const p of st.packets) p.u += dt * 1000 / TRAVEL;
    if (st.packets.some(p => p.u >= 1)) { st.packets = st.packets.filter(p => p.u < 1); event(st, now, 1); }
  }
  function draw(st, now) {
    const still = M.reduced(), v = V[st.v];
    const dt = Math.min(0.05, Math.max(0, (now - (st.last || now)) / 1000)); st.last = now;
    let T = now, lead = 1;
    if (still) {
      st.packets = [];
      if (!st.stillEv) st.stillEv = { born: 0, seed: st.seed, big: 1.1 };
      st.ev = st.stillEv; T = v.still(st);
    } else {
      if (st.ev === st.stillEv) st.ev = null;
      step(st, now, dt);
      const it = now - st.intro; lead = it < LEAD ? ease(it / LEAD) : 1;
    }
    const { w, h, dpr, n } = st, ctx = st.c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const cy = h / 2, ts = still ? st.seed % 97 : now / 1000, A = h * 0.035;
    const xs = new Float32Array(n), ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), env = Math.pow(Math.sin(Math.PI * u), 0.85);
      xs[i] = u * w;
      ys[i] = cy + env * A * (st.n1(u * 3.1 + ts * 0.55) + 0.5 * st.n2(u * 9.5 - ts * 1.7) + 0.24 * st.n3(u * 26 + ts * 4.3));
    }
    v.shape(st, T, xs, ys);
    for (let i = 0; i < n; i++) ys[i] = clampY(ys[i], h);
    const iL = Math.round(lead * 0.5 * (n - 1)), iR = (n - 1) - iL, clip = v.clip;
    const path = () => {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= iL; i++) { if (clip && clip(st, i, n)) { pen = false; continue; } pen ? ctx.lineTo(xs[i], ys[i]) : ctx.moveTo(xs[i], ys[i]); pen = true; }
      pen = false;
      for (let i = n - 1; i >= iR; i--) { if (clip && clip(st, i, n)) { pen = false; continue; } pen ? ctx.lineTo(xs[i], ys[i]) : ctx.moveTo(xs[i], ys[i]); pen = true; }
    };
    const I = st.ev ? Math.min(1, st.ev.big * Math.exp(-(T - st.ev.born) / 500)) : 0;
    ctx.globalCompositeOperation = 'lighter';
    layered(ctx, w, 0.3 + 0.7 * I, path);
    if (lead < 1) { glow(ctx, xs[iL], ys[iL], h * 0.3, CORAL, 0.95); glow(ctx, xs[iR], ys[iR], h * 0.3, AMBER, 0.95); }
    else v.extra(st, T, ctx, xs, ys, still);
    ctx.globalCompositeOperation = 'source-over';
  }
  function tick(now) {
    raf = 0;
    if (document.hidden || M.reduced()) return;
    let any = false;
    for (const st of states.values()) if (st.visible) { draw(st, now); any = true; }
    if (any) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf && !M.reduced()) raf = requestAnimationFrame(tick); };
  function mount(c) {
    const key = c.dataset.key || c.dataset.v, seed = hash(key);
    const st = { c, v: V[c.dataset.v] ? c.dataset.v : 'spikes', seed, rnd: rng(seed ^ 0x9e3779b9), packets: [], ev: null, visible: false, intro: performance.now() };
    st.n1 = noise(seed); st.n2 = noise(seed ^ 0x51ed); st.n3 = noise(seed ^ 0xa3c5);
    states.set(c, st); measure(st); draw(st, performance.now());
    if (window.ResizeObserver) new ResizeObserver(() => { measure(st); draw(st, performance.now()); }).observe(c);
    new IntersectionObserver(es => { st.visible = es.some(e => e.isIntersecting); if (st.visible) kick(); }, { threshold: 0.05 }).observe(c);
    c.addEventListener('pointerdown', () => { if (!M.reduced() && st.arrived) { event(st, performance.now(), 1.4); kick(); } });
  }
  M.onChange(() => { const now = performance.now(); for (const st of states.values()) draw(st, now); kick(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  window.GR_INVITE = {
    scan(root) { (root || document).querySelectorAll('canvas.ic').forEach(c => { if (!states.has(c)) mount(c); }); },
    /* Plays the arrival again on every canvas. */
    replay() { const now = performance.now(); for (const st of states.values()) { st.intro = now; st.arrived = false; st.packets = []; st.ev = null; } kick(); }
  };
})();
