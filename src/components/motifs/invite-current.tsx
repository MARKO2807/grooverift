"use client";

import { useMemo } from "react";
import { MotifCanvas } from "./motif-canvas";
import {
  AMBER,
  CORAL,
  HOT,
  ease,
  hash,
  mix,
  noise,
  rgba,
  rng,
  type MotifEngine,
  type RGB,
} from "./motif-lib";

/* The invite current, variant I4 "branch" (D-058), on the landing (D-076 (1) B). Ported from
   design/prototypes/pulse/invite-current.js: two charges run in from the ends, meet in the middle and a tall
   branching discharge flashes there. With reduced motion one still frame shows the two sides already joined. */

const LEAD = 520;
const TRAVEL = 760;
const tri = (d: number, half: number) => Math.max(0, 1 - Math.abs(d) / half);

type Packet = { u: number; side: -1 | 1; seed: number };
type Ev = { born: number; seed: number; big: number; tree?: number[][] };

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: RGB, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(HOT, a));
  g.addColorStop(0.3, rgba(col, a * 0.5));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

class BranchCurrent implements MotifEngine {
  private w = 0;
  private h = 0;
  private n = 80;
  private readonly seed: number;
  private readonly rnd: () => number;
  private readonly n1: (x: number) => number;
  private readonly n2: (x: number) => number;
  private readonly n3: (x: number) => number;
  private packets: Packet[] = [];
  private ev: Ev | null = null;
  private stillEv: Ev | null = null;
  private intro: number;
  private arrived = false;
  private next = 0;
  private last = 0;

  constructor(key: string) {
    this.seed = hash(key);
    this.rnd = rng(this.seed ^ 0x9e3779b9);
    this.n1 = noise(this.seed);
    this.n2 = noise(this.seed ^ 0x51ed);
    this.n3 = noise(this.seed ^ 0xa3c5);
    this.intro = typeof performance !== "undefined" ? performance.now() : 0;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.n = Math.max(80, Math.round(w / 1.2));
  }

  private event(T: number, big: number) {
    this.ev = { born: T, seed: (this.rnd() * 1e9) | 0, big };
  }

  poke(now: number) {
    if (this.arrived) this.event(now, 1.4);
  }

  private step(now: number, dt: number) {
    if (now - this.intro >= LEAD && !this.arrived) {
      this.arrived = true;
      this.event(now, 1.5);
      this.next = now + 900;
    }
    if (!this.arrived) return;
    if (now >= this.next) {
      const seed = (this.rnd() * 1e9) | 0;
      this.packets.push({ u: 0, side: -1, seed }, { u: 0, side: 1, seed: seed ^ 0x5bd1 });
      this.next = now + TRAVEL + 900 + this.rnd() * 700;
    }
    for (const p of this.packets) p.u += (dt * 1000) / TRAVEL;
    if (this.packets.some((p) => p.u >= 1)) {
      this.packets = this.packets.filter((p) => p.u < 1);
      this.event(now, 1);
    }
  }

  private tree(ev: Ev): number[][] {
    if (ev.tree) return ev.tree;
    const R = rng(ev.seed);
    const segs: number[][] = [];
    const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
      let px = x;
      let py = y;
      const steps = Math.max(3, Math.round(len / 6));
      for (let s = 0; s < steps; s++) {
        ang += (R() * 2 - 1) * 0.55;
        const nx = px + (Math.cos(ang) * len) / steps;
        const ny = py + (Math.sin(ang) * len) / steps;
        segs.push([px, py, nx, ny, depth]);
        if (depth < 2 && R() < 0.3)
          grow(
            nx,
            ny,
            ang + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.5),
            len * (0.35 + R() * 0.2),
            depth + 1,
          );
        px = nx;
        py = ny;
      }
    };
    const x0 = this.w / 2;
    const y0 = this.h / 2;
    grow(x0, y0, -Math.PI / 2 + (R() * 2 - 1) * 0.35, this.h * 0.47, 0);
    grow(x0, y0, Math.PI / 2 + (R() * 2 - 1) * 0.35, this.h * 0.47, 0);
    return (ev.tree = segs);
  }

  draw(ctx: CanvasRenderingContext2D, now: number, still: boolean) {
    const { w, h, n } = this;
    const dt = Math.min(0.05, Math.max(0, (now - (this.last || now)) / 1000));
    this.last = now;
    let T = now;
    let lead = 1;
    if (still) {
      this.packets = [];
      if (!this.stillEv) this.stillEv = { born: 0, seed: this.seed, big: 1.1 };
      this.ev = this.stillEv;
      T = 40;
    } else {
      if (this.ev === this.stillEv) this.ev = null;
      this.step(now, dt);
      const it = now - this.intro;
      lead = it < LEAD ? ease(it / LEAD) : 1;
    }
    const cy = h / 2;
    const ts = still ? this.seed % 97 : now / 1000;
    const A = h * 0.035;
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const env = Math.pow(Math.sin(Math.PI * u), 0.85);
      xs[i] = u * w;
      ys[i] =
        cy +
        env *
          A *
          (this.n1(u * 3.1 + ts * 0.55) +
            0.5 * this.n2(u * 9.5 - ts * 1.7) +
            0.24 * this.n3(u * 26 + ts * 4.3));
    }
    // the packets: sharp zigzags, tallest at the head
    const xc = w / 2;
    for (const p of this.packets) {
      const hx = p.side < 0 ? p.u * xc : w - p.u * xc;
      const R = rng(p.seed ^ Math.floor(T / 45));
      const step = 3.5;
      const K = 8;
      const pts: number[] = [];
      for (let k = -K; k <= K; k++) pts.push((k % 2 ? -1 : 1) * (0.45 + 0.55 * R()));
      for (let i = 0; i < n; i++) {
        const d = xs[i]! - hx;
        if (Math.abs(d) >= K * step) continue;
        const f = d / step + K;
        const k0 = Math.floor(f);
        const fr = f - k0;
        const v = pts[k0]! * (1 - fr) + pts[Math.min(2 * K, k0 + 1)]! * fr;
        ys[i] = ys[i]! + v * h * 0.3 * tri(d, K * step) * Math.min(1, p.u * 4);
      }
    }
    if (this.ev) {
      const k = this.ev.big * Math.exp(-(T - this.ev.born) / 280);
      for (let i = 0; i < n; i++) {
        const d = xs[i]! - xc;
        ys[i] = ys[i]! + k * h * (-0.2 * tri(d + 3, 4) + 0.2 * tri(d - 3, 4));
      }
    }
    for (let i = 0; i < n; i++) ys[i] = Math.max(3, Math.min(h - 3, ys[i]!));

    const iL = Math.round(lead * 0.5 * (n - 1));
    const iR = n - 1 - iL;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(xs[0]!, ys[0]!);
      for (let i = 1; i <= iL; i++) ctx.lineTo(xs[i]!, ys[i]!);
      ctx.moveTo(xs[n - 1]!, ys[n - 1]!);
      for (let i = n - 2; i >= iR; i--) ctx.lineTo(xs[i]!, ys[i]!);
    };
    const I0 = this.ev ? Math.min(1, this.ev.big * Math.exp(-(T - this.ev.born) / 500)) : 0;
    const I = 0.3 + 0.7 * I0;
    ctx.globalCompositeOperation = "lighter";
    // bloom, body and a white-hot core
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, rgba(CORAL, 1));
    grad.addColorStop(1, rgba(AMBER, 1));
    const hot = ctx.createLinearGradient(0, 0, w, 0);
    hot.addColorStop(0, rgba(HOT, 0));
    hot.addColorStop(0.5, rgba(HOT, 0.5 + 0.45 * Math.min(1, I)));
    hot.addColorStop(1, rgba(HOT, 0));
    ctx.lineJoin = "miter";
    ctx.miterLimit = 6;
    ctx.lineCap = "round";
    path();
    ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.04 + 0.05 * I;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.globalAlpha = 0.1 + 0.12 * I;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = hot;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (lead < 1) {
      glow(ctx, xs[iL]!, ys[iL]!, h * 0.3, CORAL, 0.95);
      glow(ctx, xs[iR]!, ys[iR]!, h * 0.3, AMBER, 0.95);
    } else {
      for (const p of this.packets) {
        const i = Math.round((p.side < 0 ? p.u * 0.5 : 1 - p.u * 0.5) * (n - 1));
        glow(ctx, xs[i]!, ys[i]!, h * 0.14, p.side < 0 ? CORAL : AMBER, 0.55);
      }
      if (this.ev) {
        const a = T - this.ev.born;
        // two flashes: 0–90 ms, dark 90–130 ms, 130–330 ms fading
        const vis = still
          ? 0.9
          : a < 90
            ? 1
            : a < 130
              ? 0.08
              : a < 330
                ? 0.95 * (1 - (a - 130) / 200)
                : 0;
        if (vis > 0.01) {
          const big = Math.min(1.3, this.ev.big);
          const J = rng(this.ev.seed ^ Math.floor(T / 30));
          glow(ctx, w / 2, h / 2, h * 0.3, mix(CORAL, AMBER, 0.5), 0.22 * vis * big);
          for (const [x1, y1, x2, y2, d] of this.tree(this.ev) as [
            number,
            number,
            number,
            number,
            number,
          ][]) {
            const jx = still ? 0 : (J() * 2 - 1) * 0.8;
            const col = mix(y2 < h / 2 ? AMBER : CORAL, HOT, 0.45 - d * 0.15);
            ctx.beginPath();
            ctx.moveTo(x1 + jx, y1);
            ctx.lineTo(x2 + jx, y2);
            ctx.strokeStyle = rgba(col, (vis * 0.22) / (d + 1));
            ctx.lineWidth = 5 - d * 1.5;
            ctx.stroke();
            ctx.strokeStyle = rgba(col, vis * (1 - d * 0.28));
            ctx.lineWidth = 1.3 - d * 0.35;
            ctx.stroke();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

export function InviteCurrent({
  height = 56,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  const engine = useMemo(() => new BranchCurrent("invite"), []);
  return <MotifCanvas engine={engine} height={height} className={className} />;
}
