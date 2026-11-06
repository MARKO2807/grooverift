// Invitations (ADM-03, PUB-05, J1; step 5.4). An invite is bound to one normalised email, single-use and
// expiring (R-08). Only a SHA-256 of the token is stored; the token itself travels in the emailed link once and
// then in an httpOnly cookie (U-05). At most one invite per email is open at a time (review L11, enforced by the
// partial unique index invitation_open_email_uq). Whether a token is usable is answered without a reason (J1 E1).
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invitation, user } from "@/lib/db/schema";
import { isUniqueViolation } from "./db-errors";

export const INVITE_TTL_DAYS = 14;
const TOKEN_BYTES = 32;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/; // 32 bytes, base64url, no padding

export type InviteLocale = "hr" | "en";
export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type InviteLookup =
  { usable: true; id: string; email: string; locale: InviteLocale } | { usable: false };

const NOT_USABLE = { usable: false } as const;

/** The invite behind a token: usable only while it is sent (not accepted or revoked) and not expired. */
export async function invitationByToken(token: string | null | undefined): Promise<InviteLookup> {
  if (!token || !TOKEN_SHAPE.test(token)) return NOT_USABLE;
  const [row] = await db()
    .select({
      id: invitation.id,
      email: invitation.email,
      locale: invitation.locale,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(eq(invitation.tokenHash, hashInviteToken(token)));
  if (!row || row.status !== "sent" || row.expiresAt.getTime() <= Date.now()) return NOT_USABLE;
  return { usable: true, id: row.id, email: row.email, locale: row.locale === "en" ? "en" : "hr" };
}

/** The address an invite was sent to, usable or not (J1 E3: a signed-in member sees "already have an account" for their own address). */
export async function invitationEmail(token: string | null | undefined): Promise<string | null> {
  if (!token || !TOKEN_SHAPE.test(token)) return null;
  const [row] = await db()
    .select({ email: invitation.email })
    .from(invitation)
    .where(eq(invitation.tokenHash, hashInviteToken(token)));
  return row?.email ?? null;
}

/** True when `token` names a usable invite for exactly `email` (the auth hooks ask this before any account is created). */
export async function invitationMatches(
  token: string | null | undefined,
  email: string,
): Promise<InviteLookup> {
  const invite = await invitationByToken(token);
  if (!invite.usable || invite.email !== normalizeEmail(email)) return NOT_USABLE;
  return invite;
}

/** Does an account with this address exist? (J1 E3 on the account step: "you already have an account".) */
export async function accountExists(email: string): Promise<boolean> {
  const [row] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalizeEmail(email)));
  return !!row;
}

export type CreateInviteResult =
  | { ok: true; id: string; token: string; email: string; expiresAt: Date }
  | { ok: false; reason: "member" | "open" | "invalid" };

/**
 * Creates an invite (admin). Refuses an address that already has an account and an address with an open invite.
 * The token is returned once, for the email; it is never stored.
 */
export async function createInvitation(input: {
  email: string;
  /** Null only for the first-admin bootstrap (`npm run admin:bootstrap`), when no admin exists yet. */
  invitedBy: string | null;
  locale: InviteLocale;
}): Promise<CreateInviteResult> {
  const email = normalizeEmail(input.email);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, reason: "invalid" };
  const [existing] = await db().select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing) return { ok: false, reason: "member" };
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  try {
    const [row] = await db()
      .insert(invitation)
      .values({
        email,
        tokenHash: hashInviteToken(token),
        invitedBy: input.invitedBy,
        locale: input.locale,
        expiresAt,
      })
      .returning({ id: invitation.id });
    return { ok: true, id: row!.id, token, email, expiresAt };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "open" };
    throw e;
  }
}

export type InviteRow = {
  id: string;
  email: string;
  /** "sent" is shown as "expired" once expires_at has passed; the row itself is not rewritten. */
  status: "sent" | "accepted" | "expired" | "revoked";
  locale: string;
  invitedByName: string | null;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
};

/** The admin list (ADM-03), newest first. Emails are shown to admins only; the page enforces that. */
export async function listInvitations(limit = 200): Promise<InviteRow[]> {
  const rows = await db()
    .select({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      locale: invitation.locale,
      invitedByName: user.name,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
    })
    .from(invitation)
    .leftJoin(user, eq(user.id, invitation.invitedBy))
    .orderBy(desc(invitation.createdAt))
    .limit(limit);
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    status: r.status === "sent" && r.expiresAt.getTime() <= now ? ("expired" as const) : r.status,
  }));
}

/** Revokes an open invite; false when it was not open (already accepted, revoked or unknown). */
export async function revokeInvitation(id: string): Promise<boolean> {
  const rows = await db()
    .update(invitation)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(invitation.id, id), eq(invitation.status, "sent")))
    .returning({ id: invitation.id });
  return rows.length > 0;
}

/**
 * Marks the invite accepted by `userId`, once. Idempotent for the same member (two tabs, J1 E2): the second call
 * returns true without changing anything. False when the invite is no longer open for anyone else.
 */
export async function acceptInvitation(id: string, userId: string): Promise<boolean> {
  const rows = await db()
    .update(invitation)
    .set({ status: "accepted", acceptedUserId: userId, acceptedAt: new Date() })
    .where(
      and(
        eq(invitation.id, id),
        eq(invitation.status, "sent"),
        gt(invitation.expiresAt, sql`now()`),
      ),
    )
    .returning({ id: invitation.id });
  if (rows.length) return true;
  const [mine] = await db()
    .select({ id: invitation.id })
    .from(invitation)
    .where(and(eq(invitation.id, id), eq(invitation.acceptedUserId, userId)));
  return !!mine;
}
