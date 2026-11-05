"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { IconBack } from "@/components/ui/icons";
import { hasInAppHistory } from "./nav-history";

/**
 * "Natrag" that returns to the previous page of the app (D-098 (1), owner choice B): a profile opened from the
 * search, a list or an answer goes back there. Opened directly (a shared link, a fresh tab) it goes to
 * `fallback`. Without JavaScript it is a plain link to `fallback`.
 */
export function BackLink({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      className="iconbtn"
      aria-label={label}
      onClick={(e) => {
        if (!hasInAppHistory()) return;
        e.preventDefault();
        router.back();
      }}
    >
      <IconBack />
    </Link>
  );
}
