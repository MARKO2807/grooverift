"use client";

import { useEffect, useRef } from "react";
import { motionReduced, onMotionChange, type MotifEngine } from "./motif-lib";

/**
 * Mounts a motif engine on a decorative canvas (aria-hidden). Frames are drawn only while the canvas is on
 * screen and the tab is visible; with reduced motion the engine draws one still frame and the loop stops
 * (D-049, D-085). Device pixel ratio is capped at 2.
 */
export function MotifCanvas({
  engine,
  height,
  className = "",
  onPoke,
}: {
  engine: MotifEngine;
  height: number;
  className?: string;
  onPoke?: (x: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let dpr = 1;
    let raf = 0;
    let visible = false;

    const measure = () => {
      const nd = Math.min(window.devicePixelRatio || 1, 2);
      const nw = Math.max(60, Math.round(c.getBoundingClientRect().width));
      if (nw === w && nd === dpr) return false;
      w = nw;
      dpr = nd;
      c.width = Math.round(w * dpr);
      c.height = Math.round(height * dpr);
      engine.resize(w, height);
      return true;
    };
    const paint = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, height);
      engine.draw(ctx, now, motionReduced());
    };
    const frame = (now: number) => {
      raf = 0;
      if (document.hidden || !visible || motionReduced()) return;
      paint(now);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible && !document.hidden && !motionReduced())
        raf = requestAnimationFrame(frame);
    };

    measure();
    paint(performance.now());
    const ro = new ResizeObserver(() => {
      if (measure()) paint(performance.now());
    });
    ro.observe(c);
    const io = new IntersectionObserver(
      (es) => {
        visible = es.some((e) => e.isIntersecting);
        kick();
      },
      { threshold: 0.05 },
    );
    io.observe(c);
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);
    const offMotion = onMotionChange(() => {
      paint(performance.now());
      kick();
    });
    const onDown = (e: PointerEvent) => {
      const x = e.clientX - c.getBoundingClientRect().left;
      if (!motionReduced()) engine.poke?.(performance.now(), x);
      onPoke?.(x);
      kick();
    };
    c.addEventListener("pointerdown", onDown);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      offMotion();
      c.removeEventListener("pointerdown", onDown);
    };
  }, [engine, height, onPoke]);

  return (
    <canvas
      ref={ref}
      className={`motif ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    />
  );
}
