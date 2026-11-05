// Shared helpers for the brand motifs (ported from design/prototypes/pulse/current.js). Decorative art only:
// raw colours here mirror the brand primitives (components.md §2 rule 1).

export type RGB = [number, number, number];
export const CORAL: RGB = [255, 88, 107];
export const AMBER: RGB = [255, 203, 105];
export const HOT: RGB = [255, 247, 238];

/** FNV-1a string hash. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** xorshift32, deterministic in [0, 1). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
export const rgba = (c: RGB, a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
export const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** Smooth 1D value noise in [-1, 1]. */
export function noise(seed: number): (x: number) => number {
  const R = rng(seed);
  const T = new Float32Array(256);
  for (let i = 0; i < 256; i++) T[i] = R() * 2 - 1;
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = T[i & 255]!;
    const b = T[(i + 1) & 255]!;
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}

/** A jagged lightning polyline between two points. */
export function bolt(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
  rnd: () => number,
  step = 7,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const n = Math.max(2, Math.round(len / step));
  const nx = -dy / len;
  const ny = dx / len;
  ctx.moveTo(x1, y1);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const o = (rnd() * 2 - 1) * amp * Math.sin(Math.PI * t);
    ctx.lineTo(x1 + dx * t + nx * o, y1 + dy * t + ny * o);
  }
  ctx.lineTo(x2, y2);
}

/** Reduced motion: the OS setting or the member's "Smanji pokrete" (html[data-motion="reduced"], D-049). */
export function motionReduced(): boolean {
  if (typeof window === "undefined") return true;
  return (
    document.documentElement.dataset.motion === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Calls `fn` when either source of the reduced-motion setting changes. Returns the unsubscribe. */
export function onMotionChange(fn: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", fn);
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    mq.removeEventListener("change", fn);
    mo.disconnect();
  };
}

/** A motif engine draws one frame; `still` asks for the reduced-motion still frame. */
export interface MotifEngine {
  resize(w: number, h: number): void;
  draw(ctx: CanvasRenderingContext2D, now: number, still: boolean): void;
  /** A tap: a short extra discharge. */
  poke?(now: number, x: number): void;
}
