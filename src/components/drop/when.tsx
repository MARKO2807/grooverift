"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";

/**
 * The neutral date of an answer or comment (D-036): the time of day for today in the member's own zone, else the
 * day and month ("12. stu"). The server renders the UTC day and month; the browser's zone fills in after
 * hydration, so nothing jumps for most members and nothing says "late" (ux-foundations §3.2).
 */
export function When({ at }: { at: string }) {
  const locale = useLocale();
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const date = new Date(at);
  const intl = locale === "en" ? "en-GB" : "hr-HR";
  if (!client) {
    return (
      <time dateTime={at}>
        {new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", timeZone: "UTC" }).format(
          date,
        )}
      </time>
    );
  }
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const sameYear = date.getFullYear() === now.getFullYear();
  const text = sameDay
    ? new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit" }).format(date)
    : new Intl.DateTimeFormat(intl, {
        day: "numeric",
        month: "short",
        ...(sameYear ? {} : { year: "numeric" }),
      }).format(date);
  return <time dateTime={at}>{text}</time>;
}
