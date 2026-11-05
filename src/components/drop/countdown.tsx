"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// Before the first Daily Drop (D-078 (8), pulse firstBlock b): a countdown with seconds to 00:00 UTC of the first
// scheduled date. It is hidden from screen readers, which get one fixed sentence that follows the clock without
// being a live region. With "Smanji pokrete" or the OS setting it shows minutes only and updates once a minute
// (WCAG 2.2.2). At zero it gives way to "any moment now". Nothing renders on the server (the clock is the
// browser's).

const reducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Countdown({ target }: { target: string }) {
  const t = useTranslations("drop.first");
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [now, setNow] = useState(() => Date.now());
  const end = new Date(target).getTime();

  useEffect(() => {
    const calm = reducedMotion();
    const id = window.setInterval(() => setNow(Date.now()), calm ? 60_000 : 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!client) return null;
  const left = Math.max(0, Math.floor((end - now) / 1000));
  if (!left) return <p className="first-count">{t("anyMoment")}</p>;
  const calm = reducedMotion();
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <>
      <p className="first-count" aria-hidden="true">
        <span className="first-n">{h}</span>
        <span className="first-u">h</span>
        <span className="first-n">{two(m)}</span>
        <span className="first-u">min</span>
        {calm ? null : (
          <>
            <span className="first-n">{two(s)}</span>
            <span className="first-u">s</span>
          </>
        )}
      </p>
      <p className="sr-only">{t("countdownSr", { hours: h, minutes: m })}</p>
    </>
  );
}

/** "U 01:00 po tvom vremenu (00:00 UTC)" in the browser's zone; the server renders the UTC sentence. */
export function LocalRelease({ at }: { at: string }) {
  const t = useTranslations("drop.first");
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!client) return <span>{t("releaseUtc")}</span>;
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(at),
  );
  return <span>{t("releaseLocal", { time })}</span>;
}
