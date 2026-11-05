import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { memberSettings } from "@/lib/db/schema";

/** The member's "Smanji pokrete" (D-049). Visitors have only the system setting (D-085), so "full" for them;
 *  the CSS and the motif canvases also follow prefers-reduced-motion on their own. */
export async function motionPreference(): Promise<"reduced" | "full"> {
  const session = await getSession();
  if (!session) return "full";
  const [row] = await db()
    .select({ reduceMotion: memberSettings.reduceMotion })
    .from(memberSettings)
    .where(eq(memberSettings.userId, session.user.id));
  return row?.reduceMotion ? "reduced" : "full";
}
