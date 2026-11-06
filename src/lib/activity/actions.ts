"use server";

import { getSession } from "@/lib/auth/session";
import { logDbError } from "@/lib/data/db-errors";
import { markActivityRead } from "@/lib/data/notifications";

// ACT-01 (step 5.8): the page marks what it showed as read once it is on screen, so the tint is visible on this
// visit and gone on the next. Never on the GET itself (a prefetch must not read anyone's Activity). The member
// comes from the session; the client only names the newest entry the page showed.

/** Marks the viewer's entries up to `upTo` (ISO time of the newest entry the page rendered) as read. */
export async function markActivityReadAction(upTo: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const at = new Date(upTo);
  if (Number.isNaN(at.getTime())) return;
  // The ISO time has milliseconds and PostgreSQL keeps microseconds, so the bound is the end of that millisecond.
  // Never ahead of the server clock: entries that arrive after the page rendered stay unread.
  const bound = new Date(Math.min(at.getTime() + 1, Date.now()));
  try {
    await markActivityRead(session.user.id, bound);
  } catch (error) {
    logDbError("markActivityReadAction", error);
  }
}
