"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { countNavigation } from "./shell/nav-history";

/** Navigation moves focus to the new page's h1 (components §3.2, WCAG 2.4.3). The first render is
 *  skipped so the skip link stays the first Tab stop on a fresh load; `preventScroll` keeps the page
 *  where the browser put it. The h1 elements carry tabIndex={-1}. */
export function FocusOnNavigate() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === null) {
      last.current = pathname;
      return;
    }
    if (last.current === pathname) return;
    last.current = pathname;
    countNavigation(); // BackLink returns through history only after an in-app navigation
    // The page's h1 is in main, or in the top bar on screens whose title is the bar title (AppShell).
    const h1 = document.querySelector<HTMLElement>("main h1, .topbar h1");
    h1?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
