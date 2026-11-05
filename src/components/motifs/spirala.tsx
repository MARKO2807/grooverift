"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MotifCanvas } from "./motif-canvas";
import { HOT, bolt, mix, rgba, rng, type MotifEngine } from "./motif-lib";
import {
  genreKey,
  genreName,
  segmentAt,
  spiralaModel,
  type SpiralaArtist,
  type SpiralaGenre,
  type SpiralaModel,
} from "./spirala-model";

/* The Music DNA picture, "Spirala" (D-048, D-052, D-067 (4)). Ported from design/prototypes/pulse/dna.js:
   a double helix whose sections are the member's genres (length = weight, colour, height, twist and behaviour
   from the genre's traits), artists as bright beads, heavy music with a charred core and sparks. It stays gently
   alive and leaves one still frame with reduced motion (D-049). Not playback and not an equalizer: nothing is
   bound to audio. The canvas is decorative; the figure is named by its caption and a visually hidden list
   names the genres and artists (components §4.14). */

const CHAR: [number, number, number] = [20, 6, 10];
const DARK: [number, number, number] = [11, 13, 18];
const STILL_T = 3.7;

type Pt = {
  x: number;
  si: number;
  ul: number;
  env: number;
  ph: number;
  y1: number;
  y2: number;
  z: number;
};

export class SpiralaEngine implements MotifEngine {
  private w = 0;
  private h = 0;
  private charge: number | null;

  constructor(
    readonly model: SpiralaModel,
    intro: boolean,
  ) {
    this.charge = intro && model.segs.length ? performance.now() : null;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  poke(now: number) {
    this.charge = now;
  }

  draw(ctx: CanvasRenderingContext2D, now: number, still: boolean) {
    const ct = this.charge == null || still ? 1e9 : now - this.charge;
    const I = ct < 1800 ? Math.exp(-ct / 600) : 0;
    drawSpirala(ctx, this.w, this.h, this.model, still ? STILL_T : now / 1000, I);
  }
}

export function drawSpirala(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  m: SpiralaModel,
  t: number,
  I: number,
) {
  const pad = 14;
  const L = w - pad * 2;
  const cy = h / 2;
  if (!m.segs.length) {
    ctx.beginPath();
    ctx.moveTo(pad, cy);
    ctx.lineTo(w - pad, cy);
    ctx.strokeStyle = "#2A2F3B";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    return;
  }
  // soft glow behind, in the member's own colours
  for (const s of m.segs) {
    const x = pad + ((s.u0 + s.u1) / 2) * L;
    const r = Math.max(30, (s.u1 - s.u0) * L * 0.9);
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, r);
    g.addColorStop(0, rgba(s.col, 0.11 + 0.08 * I));
    g.addColorStop(1, rgba(s.col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, cy - r, 2 * r, 2 * r);
  }
  const N = Math.ceil(L / 2);
  const pts: Pt[] = new Array(N + 1);
  let si = 0;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = pad + u * L;
    si = segmentAt(m, u, si);
    const s = m.segs[si]!;
    const g = s.g;
    const ul = (u - s.u0) / Math.max(1e-6, s.u1 - s.u0);
    const env = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, ul)))), 0.55);
    let A = h * (0.15 + 0.17 * g.e) * s.amp * env;
    if (g.k === "swell") A *= 0.84 + 0.16 * Math.sin(t * 0.9 + ul * 2.5 + s.ph);
    else A *= 1 + 0.035 * Math.sin(t * 1.7 + s.ph);
    let ph = (2 * Math.PI * (x - pad - s.u0 * L)) / s.lambda + s.ph + t * s.spin;
    if (g.k === "swing") ph += 0.7 * g.s * Math.sin(x * 0.045 + t * 1.4);
    const edge = g.j > 0.55 ? (g.j - 0.55) / 0.45 : 0;
    const jit = edge * h * 0.03 * (0.6 + I) * env * (g.f === 0 ? 1.7 : 1); // heavy music crackles harder (D-067)
    const j1 = jit * m.n1(x * 0.4 + t * 11);
    const j2 = jit * m.n2(x * 0.4 - t * 11);
    pts[i] = {
      x,
      si,
      ul,
      env,
      ph,
      y1: cy + A * Math.sin(ph) + j1,
      y2: cy - A * Math.sin(ph) + j2,
      z: Math.cos(ph),
    };
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // rungs: bars and dots after the Rift Pulse waveform; each family moves its own way
  for (let i = 3; i < N - 2; i += 5) {
    const p = pts[i]!;
    const s = m.segs[p.si]!;
    const g = s.g;
    if (Math.abs(p.y1 - p.y2) < 4) continue;
    const top = Math.min(p.y1, p.y2) + 2.5;
    const bot = Math.max(p.y1, p.y2) - 2.5;
    let a = (0.22 + 0.5 * Math.abs(Math.sin(p.ph))) * p.env;
    const beat = Math.pow(Math.max(0, Math.cos((Math.PI * 2 * t * s.bpm) / 60)), 6);
    if (g.k === "square") a *= 0.45 + 0.9 * beat;
    if (g.k === "burst") {
      const k = Math.floor(i / 5);
      a *= (k + Math.floor((t * s.bpm) / 30)) % 3 === 0 ? 1.3 : 0.25;
    }
    const col = mix(s.col, HOT, 0.15 + 0.25 * I);
    ctx.globalAlpha = Math.min(1, a);
    ctx.strokeStyle = rgba(col, 1);
    ctx.fillStyle = rgba(col, 1);
    if (g.k === "saw") {
      ctx.beginPath();
      bolt(ctx, p.x, top, p.x, bot, 1.4 + 1.6 * I, rng((i * 7919) ^ Math.floor(t * 18)), 4);
      ctx.lineWidth = 1.1;
      ctx.stroke();
    } else if (g.k === "swing" && Math.floor(i / 5) % 2) {
      ctx.beginPath();
      ctx.arc(p.x, (p.y1 + p.y2) / 2, 1.9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x, top);
      ctx.lineTo(p.x, bot);
      ctx.lineWidth = g.k === "swell" ? 1.4 : 2.2;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // strands: back pieces first (thin, dim), then front pieces (wide, bright); a dark edge under the front strand
  // makes it cover the back strand where they cross (the depth cue)
  for (const front of [false, true]) {
    if (front) {
      ctx.globalCompositeOperation = "source-over";
      for (let k = 0; k < 2; k++) {
        for (let i = 1; i <= N; i++) {
          const p = pts[i - 1]!;
          const q = pts[i]!;
          const z = k === 0 ? q.z : -q.z;
          if (z <= 0) continue;
          const d = (z + 1) / 2;
          ctx.beginPath();
          ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2);
          ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
          ctx.strokeStyle = rgba(DARK, 0.7 * Math.min(1, z * 2.5) * q.env);
          ctx.lineWidth = 2.2 + 2.6 * d + 3;
          ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 2; k++) {
      for (let i = 1; i <= N; i++) {
        const p = pts[i - 1]!;
        const q = pts[i]!;
        const z = k === 0 ? q.z : -q.z;
        if (z > 0 !== front) continue;
        const d = (z + 1) / 2;
        const s = m.segs[q.si]!;
        const col = k === 0 ? s.col : mix(s.col, HOT, 0.42);
        ctx.beginPath();
        ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2);
        ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
        ctx.strokeStyle = rgba(col, (0.18 + 0.82 * d) * (0.35 + 0.65 * q.env));
        ctx.lineWidth = 0.7 + 2.6 * d;
        ctx.stroke();
        if (front && d > 0.5) {
          ctx.strokeStyle = rgba(col, (0.13 + 0.17 * I) * q.env);
          ctx.lineWidth = 7 + 4 * I;
          ctx.stroke();
        }
      }
    }
  }
  // Heavy music (family 0, D-067): a charred black core inside the front strands and sparks that fly off.
  if (m.segs.some((s) => s.g.f === 0)) {
    for (let k = 0; k < 2; k++) {
      for (let i = 1; i <= N; i++) {
        const p = pts[i - 1]!;
        const q = pts[i]!;
        const s = m.segs[q.si]!;
        if (s.g.f !== 0) continue;
        const z = k === 0 ? q.z : -q.z;
        if (z <= 0) continue;
        const flick = 0.75 + 0.25 * Math.sin(t * 23 + i * 0.7);
        ctx.beginPath();
        ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2);
        ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
        ctx.strokeStyle = rgba(mix(s.col, HOT, 0.2), (0.16 + 0.14 * I) * q.env * flick);
        ctx.lineWidth = 7 + 3 * z;
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    for (let k = 0; k < 2; k++) {
      for (let i = 1; i <= N; i++) {
        const p = pts[i - 1]!;
        const q = pts[i]!;
        if (m.segs[q.si]!.g.f !== 0) continue;
        const z = k === 0 ? q.z : -q.z;
        if (z <= 0.15) continue;
        const d = (z + 1) / 2;
        ctx.beginPath();
        ctx.moveTo(p.x, k === 0 ? p.y1 : p.y2);
        ctx.lineTo(q.x, k === 0 ? q.y1 : q.y2);
        ctx.strokeStyle = rgba(CHAR, 0.8 * q.env * Math.min(1, (z - 0.15) * 3));
        ctx.lineWidth = 0.5 + 1.1 * d;
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "lighter";
    m.segs.forEach((s, idx) => {
      if (s.g.f !== 0) return;
      const R = rng((m.seed ^ (idx * 977)) + Math.floor(t * 7));
      const n = R() < 0.75 ? 1 + Math.floor(R() * 3) : 0;
      for (let k = 0; k < n; k++) {
        const p = pts[Math.round((s.u0 + (0.15 + 0.7 * R()) * (s.u1 - s.u0)) * N)]!;
        const y = R() < 0.5 ? p.y1 : p.y2;
        const ang = R() * Math.PI * 2;
        const len = 6 + R() * 9;
        ctx.beginPath();
        ctx.moveTo(p.x, y);
        ctx.lineTo(p.x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.strokeStyle = rgba(mix(s.col, HOT, 0.6), 0.95 * p.env);
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    });
  }
  // knots that join the genres, and the two ends
  const knots = [0, ...m.segs.map((s) => s.u1)];
  knots.forEach((u, k) => {
    const x = pad + u * L;
    const a = m.segs[Math.max(0, k - 1)]!.col;
    const b = m.segs[Math.min(m.segs.length - 1, k)]!.col;
    const col = mix(a, b, 0.5);
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + k * 1.3);
    const r = k === 0 || k === m.segs.length ? 2 : 3 + pulse * 1.2 + 2 * I;
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, r * 4);
    g.addColorStop(0, rgba(HOT, 0.9));
    g.addColorStop(0.3, rgba(col, 0.5));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4, cy - r * 4, r * 8, r * 8);
  });
  // artists: bright beads riding the strands
  for (const b of m.beads) {
    const p = pts[Math.max(0, Math.min(N, Math.round(b.u * N)))]!;
    const y = b.strand ? p.y2 : p.y1;
    const z = b.strand ? -p.z : p.z;
    const d = (z + 1) / 2;
    const r = 2.4 + 1.2 * d;
    const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, r * 3.4);
    g.addColorStop(0, rgba(HOT, 0.55 + 0.45 * d));
    g.addColorStop(0.35, rgba(b.col, 0.45 * (0.4 + 0.6 * d)));
    g.addColorStop(1, rgba(b.col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r * 3.4, y - r * 3.4, r * 6.8, r * 6.8);
  }
  ctx.globalCompositeOperation = "source-over";
}

export function Spirala({
  genres,
  artists = [],
  caption,
  height = 200,
  captionHidden = false,
  intro = true,
}: {
  genres: SpiralaGenre[];
  artists?: SpiralaArtist[];
  /** Names the figure (components §4.14). */
  caption: string;
  height?: number;
  captionHidden?: boolean;
  /** The arrival charge plays once when the picture appears. */
  intro?: boolean;
}) {
  const t = useTranslations("spirala");
  const id = useId();
  const key =
    genres.map((g) => `${genreKey(g)}:${genreName(g)}`).join("|") +
    "#" +
    artists.map((a) => a.name).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the model depends only on the picks, keyed above
  const model = useMemo(() => spiralaModel(genres, artists), [key]);
  const engine = useMemo(() => new SpiralaEngine(model, intro), [model, intro]);
  const [tip, setTip] = useState<{ x: number; name: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const figRef = useRef<HTMLElement>(null);
  // A tapped section shows its genre for a moment (decorative; the list below is the text equivalent).
  const onPoke = useCallback(
    (x: number) => {
      const fig = figRef.current;
      if (!fig || !model.segs.length) return;
      const width = fig.clientWidth;
      const u = Math.max(0, Math.min(1, (x - 14) / Math.max(1, width - 28)));
      const s = model.segs[segmentAt(model, u)]!;
      const cx = 14 + ((s.u0 + s.u1) / 2) * (width - 28);
      setTip({ x: Math.max(70, Math.min(width - 70, cx)), name: s.g.n });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTip(null), 1800);
    },
    [model],
  );
  const byGenre = genres.map(genreName).map((g) => ({
    genre: g,
    artists: artists.filter((a) => a.genres.includes(g)).map((a) => a.name),
  }));
  return (
    <figure ref={figRef} className="dna-card" aria-labelledby={`${id}-cap`}>
      <MotifCanvas engine={engine} height={height} className="dna" onPoke={onPoke} />
      {tip ? (
        <span className="dna-tip" aria-hidden="true" style={{ left: tip.x, top: 16 }}>
          <b>{tip.name}</b>
        </span>
      ) : null}
      <figcaption id={`${id}-cap`} className={captionHidden ? "sr-only" : undefined}>
        {caption}
      </figcaption>
      <ul className="sr-only" aria-label={t("listLabel")}>
        {byGenre.length ? (
          byGenre.map((g) => (
            <li key={g.genre}>
              {g.artists.length
                ? t("artists", { genre: g.genre, artists: g.artists.join(", ") })
                : g.genre}
            </li>
          ))
        ) : (
          <li>{t("empty")}</li>
        )}
      </ul>
    </figure>
  );
}
