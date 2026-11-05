"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { TAB_HREFS } from "./tab-hrefs";

/**
 * Swipe between the four main tabs on the phone (D-060 (f)). An extra path only: the tab bar does the same
 * (WCAG 2.5.1). The page follows the finger; a short or mostly vertical move snaps back. Ignored on form
 * fields, canvases, horizontal scrollers ([data-noswipe]), with a mouse from 600 px and while a dialog is open.
 */
export function SwipeTabs({ current }: { current?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (current == null || current < 0) return;
    const main = document.querySelector<HTMLElement>("main#main");
    if (!main) return;
    const dir = sessionStorage.getItem("gr-swipe");
    if (dir) {
      sessionStorage.removeItem("gr-swipe");
      main.classList.add(dir === "next" ? "swipe-next" : "swipe-prev");
    }
    let sw: { x: number; y: number; t: number; h: boolean | null; id: number } | null = null;
    let dragged = false;
    const onDown = (e: PointerEvent) => {
      dragged = false;
      if (e.pointerType === "mouse" && (e.button !== 0 || window.innerWidth >= 600)) return;
      if (window.innerWidth >= 600) return; // the rail replaces the tab bar; no swipe there
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const target = e.target as Element;
      if (target.closest("input, textarea, select, canvas, [data-noswipe]")) return;
      sw = { x: e.clientX, y: e.clientY, t: performance.now(), h: null, id: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x;
      const dy = e.clientY - sw.y;
      if (sw.h === null && Math.hypot(dx, dy) > 10) sw.h = Math.abs(dx) > Math.abs(dy) * 1.4;
      if (sw.h === false) {
        sw = null;
        return;
      }
      if (!sw.h) return;
      const edge = (dx > 0 && current === 0) || (dx < 0 && current === TAB_HREFS.length - 1);
      main.style.transition = "none";
      main.style.transform = `translateX(${dx * (edge ? 0.15 : 0.5)}px)`;
    };
    const end = (e: PointerEvent, cancel: boolean) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x;
      const fast = performance.now() - sw.t < 700;
      const h = sw.h;
      sw = null;
      if (h) dragged = true; // the click after a drag must not open what was under the finger
      const next = current + (dx < 0 ? 1 : -1);
      if (!cancel && h && fast && Math.abs(dx) >= 60 && next >= 0 && next < TAB_HREFS.length) {
        sessionStorage.setItem("gr-swipe", dx < 0 ? "next" : "prev");
        router.push(TAB_HREFS[next]!);
        return;
      }
      if (main.style.transform) {
        main.style.transition = "transform 180ms ease-out";
        main.style.transform = "";
      }
    };
    const onUp = (e: PointerEvent) => end(e, false);
    const onCancel = (e: PointerEvent) => end(e, true);
    const onClick = (e: MouseEvent) => {
      if (dragged) {
        dragged = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    main.addEventListener("pointerdown", onDown);
    main.addEventListener("pointermove", onMove);
    main.addEventListener("pointerup", onUp);
    main.addEventListener("pointercancel", onCancel);
    main.addEventListener("click", onClick, true);
    return () => {
      main.removeEventListener("pointerdown", onDown);
      main.removeEventListener("pointermove", onMove);
      main.removeEventListener("pointerup", onUp);
      main.removeEventListener("pointercancel", onCancel);
      main.removeEventListener("click", onClick, true);
    };
  }, [current, router]);
  return null;
}
