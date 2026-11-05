import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Viewer } from "@/lib/authz";
import { memberPage } from "@/lib/auth/member-page";
import { getSession, roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { profileByUsername, type ProfileView } from "@/lib/data/profiles";
import type { Session } from "@/lib/auth/auth";

/**
 * The viewer for a profile route (which visitors may open, PUB-08): the signed-in member with fresh facts, or
 * the anonymous viewer. A signed-in member who has not finished onboarding is sent to their next step first
 * (J1 E8), like every other app route. Cached per request, so generateMetadata and the page share one read.
 */
export const profileViewer = cache(
  async (locale: string, path: string): Promise<{ viewer: Viewer; session: Session | null }> => {
    const session = await getSession();
    if (session) await memberPage(locale, path);
    const viewer = await loadViewer(
      session ? { id: session.user.id, role: roleOf(session) } : null,
    );
    return { viewer, session };
  },
);

/** The profile as the current viewer may see it, read once per request. */
export const profileView = cache(
  async (
    locale: string,
    username: string,
  ): Promise<ProfileView & { viewer: Viewer; session: Session | null }> => {
    const { viewer, session } = await profileViewer(locale, `/@${username}`);
    const view = await profileByUsername(viewer, username);
    return { ...view, viewer, session };
  },
);

/** SYS-01 with 404 for every hidden reason. A function declaration, so TypeScript narrows after the call. */
export function notAvailable(): never {
  notFound();
}
