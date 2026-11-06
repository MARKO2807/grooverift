import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth, type Session } from "./auth";
import { isRole, type Role } from "./roles";

/** The current session, read once per request (React cache). Null when signed out. */
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
});

export class Unauthenticated extends Error {
  constructor() {
    super("UNAUTHENTICATED");
  }
}
export class Forbidden extends Error {
  constructor(public readonly reason: string = "FORBIDDEN") {
    super(reason);
  }
}

/** Throws when signed out. Pages catch this and redirect to sign-in; actions return an error. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Unauthenticated();
  return session;
}

export function roleOf(session: Session | null): Role {
  const role = session?.user.role;
  return isRole(role) ? role : "member";
}

/** Staff gate: the role must be one of `roles` AND the account must have a second factor (threat model §3). */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireSession();
  const role = roleOf(session);
  if (!roles.includes(role)) throw new Forbidden("ROLE");
  if (role !== "member" && !session.user.twoFactorEnabled)
    throw new Forbidden("TWO_FACTOR_REQUIRED");
  // Review 5.9 L1: a suspended or banned account keeps no staff power (status read fresh, not from the session).
  if (role !== "member" && !(await isActive(session.user.id))) throw new Forbidden("ROLE");
  return session;
}

async function isActive(userId: string): Promise<boolean> {
  const { loadViewer } = await import("@/lib/data/facts");
  return (await loadViewer({ id: userId, role: "member" })).status === "active";
}

export type StaffGate =
  | { ok: true; session: Session; role: Role }
  | { ok: false; reason: "UNAUTHENTICATED" | "ROLE" | "TWO_FACTOR_REQUIRED" };

/** The same gate for PAGES: every admin page calls this itself. Next.js may render a page without
 *  its layout (the client-supplied router state decides), so a layout check alone is not a guard. */
export async function staffGate(...roles: Role[]): Promise<StaffGate> {
  try {
    const session = await requireRole(...roles);
    return { ok: true, session, role: roleOf(session) };
  } catch (error) {
    if (error instanceof Unauthenticated) return { ok: false, reason: "UNAUTHENTICATED" };
    if (error instanceof Forbidden)
      return { ok: false, reason: error.reason as "ROLE" | "TWO_FACTOR_REQUIRED" };
    throw error;
  }
}
