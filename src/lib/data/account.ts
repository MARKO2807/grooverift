// The account lifecycle (step 5.10; SET-09, D-063 (9), D-066, D-070 (7), plan §1.2 "Deletion workflow", D-109).
//
// Rules held here:
// - Deactivate: the account is hidden at once (the policy hides every status but "active"), every session ends,
//   nothing is deleted; the next completed sign-in brings it back (reactivateOnSignIn, called from auth.ts).
// - Delete: the account is hidden at once, every session ends, and a deletion request is due GRACE_DAYS later.
//   Signing in during the grace period shows the choice "Vrati račun" / "Odjavi se" (prototype `pending`); only
//   "Vrati račun" cancels the request (restoreAccount).
// - The purge (purgeDueAccounts, a worker job) erases the member: profile, settings, Music DNA, follows, blocks,
//   mutes, sessions and sign-in methods with the user row (foreign keys cascade); answers, comments and reactions
//   are deleted, and an answer keeps an empty placeholder only where other members' live comments hang on it
//   (Master Prompt §3: no anonymous full posts). Moderation records stay under their retention without the
//   member's identity (foreign keys set null; the moderation copy keeps its own purge date). The audit log is
//   append-only and keeps the pseudonymous id and the keyed IP hash under the audit retention (counsel B.3).
// - Staff accounts cannot be deactivated or deleted while they hold a role (an admin removes the role first),
//   so the last admin cannot lock the team out by accident.
import { and, asc, eq, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { clearAccountLock } from "@/lib/auth/lockout";
import { STAFF_ROLES, isRole } from "@/lib/auth/roles";
import { deletionDate } from "@/lib/account/rules";
import { db } from "@/lib/db/client";
import {
  account,
  catalogReference,
  comment,
  dailyDropAnswer as answer,
  deletionRequest,
  featureFlag,
  feedbackReport,
  invitation,
  report,
  notification,
  reaction,
  session,
  user,
  verification,
} from "@/lib/db/schema";
import { isUniqueViolation, logDbError } from "./db-errors";

export type AccountFacts = {
  status: string;
  email: string;
  role: string | null;
  hasPassword: boolean;
  google: boolean;
  /** The Better Auth account row of the Google link (for unlinking), or null. */
  googleAccountId: string | null;
  isStaff: boolean;
};

/** What the account screens need: status, sign-in methods and whether a role blocks deactivation. */
export async function accountFacts(userId: string): Promise<AccountFacts | null> {
  const [u] = await db()
    .select({ status: user.status, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, userId));
  if (!u) return null;
  const methods = await db()
    .select({ id: account.id, provider: account.providerId, password: account.password })
    .from(account)
    .where(eq(account.userId, userId));
  return {
    ...u,
    hasPassword: methods.some((m) => m.provider === "credential" && !!m.password),
    google: methods.some((m) => m.provider === "google"),
    googleAccountId: methods.find((m) => m.provider === "google")?.id ?? null,
    isStaff: isRole(u.role) && STAFF_ROLES.includes(u.role),
  };
}

export type LifecycleResult =
  { ok: true; scheduledFor?: Date } | { ok: false; reason: "staff" | "state" | "generic" };

/** SET-09 "Deaktiviraj": hidden, signed out everywhere, nothing deleted. Only an active member. */
export async function deactivateAccount(userId: string): Promise<LifecycleResult> {
  const facts = await accountFacts(userId);
  if (!facts) return { ok: false, reason: "state" };
  if (facts.isStaff) return { ok: false, reason: "staff" };
  const done = await db().transaction(async (tx) => {
    const rows = await tx
      .update(user)
      .set({ status: "deactivated" })
      .where(and(eq(user.id, userId), eq(user.status, "active")))
      .returning({ id: user.id });
    if (!rows.length) return false;
    await tx.delete(session).where(eq(session.userId, userId));
    return true;
  });
  if (!done) return { ok: false, reason: "state" };
  await audit({ actorType: "member", actorId: userId, action: "account.deactivated" });
  return { ok: true };
}

/** Ends every session of a member (review 5.10 L4: after repeated wrong password confirmations). */
export async function signOutEverywhere(userId: string): Promise<void> {
  await db().delete(session).where(eq(session.userId, userId));
}

/** The next completed sign-in of a deactivated member brings the account back ("Kad se opet prijaviš…"). */
export async function reactivateOnSignIn(
  userId: string,
  opts: { firstFactorOnly?: boolean } = {},
): Promise<boolean> {
  // Review 5.10 M1: with a second factor, the password step creates a session that the two-factor plugin deletes
  // again; only the completed sign-in (the verify step's own session) may bring the account back.
  const rows = await db()
    .update(user)
    .set({ status: "active" })
    .where(
      and(
        eq(user.id, userId),
        eq(user.status, "deactivated"),
        opts.firstFactorOnly ? sql`${user.twoFactorEnabled} is not true` : undefined,
      ),
    )
    .returning({ id: user.id });
  if (!rows.length) return false;
  await audit({ actorType: "member", actorId: userId, action: "account.reactivated" });
  return true;
}

/**
 * SET-09 "Izbriši trajno": the account is hidden at once and every session ends; the purge runs GRACE_DAYS later.
 * An active or deactivated member may ask; a suspended or banned one cannot reach this flow (their request goes
 * through the privacy contact, D-066 (2)).
 */
export async function requestDeletion(userId: string, now = new Date()): Promise<LifecycleResult> {
  const facts = await accountFacts(userId);
  if (!facts) return { ok: false, reason: "state" };
  if (facts.isStaff) return { ok: false, reason: "staff" };
  const scheduledFor = deletionDate(now);
  try {
    const done = await db().transaction(async (tx) => {
      const rows = await tx
        .update(user)
        .set({ status: "pending_deletion" })
        .where(and(eq(user.id, userId), inArray(user.status, ["active", "deactivated"])))
        .returning({ id: user.id });
      if (!rows.length) return false;
      await tx.insert(deletionRequest).values({ userId, requestedAt: now, scheduledFor });
      await tx.delete(session).where(eq(session.userId, userId));
      return true;
    });
    if (!done) return { ok: false, reason: "state" };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "state" };
    throw e;
  }
  await audit({
    actorType: "member",
    actorId: userId,
    action: "account.deletion.requested",
    metadata: { scheduledFor: scheduledFor.toISOString() },
  });
  return { ok: true, scheduledFor };
}

export type PendingDeletion = { requestedAt: Date; scheduledFor: Date };

/** The open deletion request of a member in the grace period, or null. */
export async function pendingDeletion(userId: string): Promise<PendingDeletion | null> {
  const [row] = await db()
    .select({
      requestedAt: deletionRequest.requestedAt,
      scheduledFor: deletionRequest.scheduledFor,
    })
    .from(deletionRequest)
    .innerJoin(user, eq(user.id, deletionRequest.userId))
    .where(
      and(
        eq(deletionRequest.userId, userId),
        isNull(deletionRequest.cancelledAt),
        isNull(deletionRequest.completedAt),
        eq(user.status, "pending_deletion"),
      ),
    );
  return row ?? null;
}

/** "Vrati račun": cancels the open request and makes the account active again, as it was. */
export async function restoreAccount(userId: string, now = new Date()): Promise<boolean> {
  const done = await db().transaction(async (tx) => {
    const req = await tx
      .update(deletionRequest)
      .set({ cancelledAt: now })
      .where(
        and(
          eq(deletionRequest.userId, userId),
          isNull(deletionRequest.cancelledAt),
          isNull(deletionRequest.completedAt),
          // A request already due is the purge's; the member cannot race it.
          sql`${deletionRequest.scheduledFor} > ${now.toISOString()}::timestamptz`,
        ),
      )
      .returning({ id: deletionRequest.id });
    if (!req.length) return false;
    await tx
      .update(user)
      .set({ status: "active" })
      .where(and(eq(user.id, userId), eq(user.status, "pending_deletion")));
    return true;
  });
  if (done)
    await audit({ actorType: "member", actorId: userId, action: "account.deletion.cancelled" });
  return done;
}

// ============================================================ The purge

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/**
 * Erases one member inside the caller's transaction. Returns the counts per step for the request's record (no
 * personal data in them). Safe to run again: every step selects by the member's id.
 */
async function eraseMember(tx: Tx, userId: string, now: Date): Promise<Record<string, string>> {
  const steps: Record<string, string> = {};
  const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, userId));

  // 1. Comments: flat under answers in the alpha (nothing replies to a comment), so every one goes.
  const myComments = (
    await tx.select({ id: comment.id }).from(comment).where(eq(comment.authorId, userId))
  ).map((r) => r.id);
  if (myComments.length) {
    await tx
      .delete(reaction)
      .where(and(eq(reaction.targetType, "comment"), inArray(reaction.targetId, myComments)));
    await tx
      .delete(catalogReference)
      .where(
        and(
          eq(catalogReference.ownerType, "comment"),
          inArray(catalogReference.ownerId, myComments),
        ),
      );
    await tx
      .delete(notification)
      .where(
        and(eq(notification.targetType, "comment"), inArray(notification.targetId, myComments)),
      );
    await tx.delete(comment).where(inArray(comment.id, myComments));
  }
  steps.comments = String(myComments.length);

  // 2. Answers: a placeholder only where other members' live comments hang on it; otherwise gone with its thread.
  const myAnswers = (
    await tx.select({ id: answer.id }).from(answer).where(eq(answer.authorId, userId))
  ).map((r) => r.id);
  let kept: string[] = [];
  if (myAnswers.length) {
    kept = (
      await tx
        .selectDistinct({ id: comment.answerId })
        .from(comment)
        .where(
          and(
            inArray(comment.answerId, myAnswers),
            isNotNull(comment.authorId),
            ne(comment.authorId, userId),
            isNull(comment.deletedAt),
            isNull(comment.removedAt),
          ),
        )
    ).map((r) => r.id);
    const dropped = myAnswers.filter((id) => !kept.includes(id));
    // Reactions, catalogue cards and Activity entries go for every answer, kept or not.
    await tx
      .delete(reaction)
      .where(and(eq(reaction.targetType, "answer"), inArray(reaction.targetId, myAnswers)));
    await tx
      .delete(catalogReference)
      .where(
        and(eq(catalogReference.ownerType, "answer"), inArray(catalogReference.ownerId, myAnswers)),
      );
    await tx
      .delete(notification)
      .where(and(eq(notification.targetType, "answer"), inArray(notification.targetId, myAnswers)));
    if (kept.length)
      await tx
        .update(answer)
        .set({
          body: "",
          authorId: null,
          language: null,
          editedAt: null,
          deletedAt: sql`coalesce(${answer.deletedAt}, ${now.toISOString()}::timestamptz)`,
        })
        .where(inArray(answer.id, kept));
    if (dropped.length) {
      // What is left under a dropped answer is other members' deleted or removed comments: content already gone.
      const under = (
        await tx.select({ id: comment.id }).from(comment).where(inArray(comment.answerId, dropped))
      ).map((r) => r.id);
      if (under.length) {
        await tx
          .delete(reaction)
          .where(and(eq(reaction.targetType, "comment"), inArray(reaction.targetId, under)));
        await tx
          .delete(catalogReference)
          .where(
            and(
              eq(catalogReference.ownerType, "comment"),
              inArray(catalogReference.ownerId, under),
            ),
          );
        await tx
          .delete(notification)
          .where(
            and(eq(notification.targetType, "comment"), inArray(notification.targetId, under)),
          );
        await tx.delete(comment).where(inArray(comment.id, under));
      }
      await tx.delete(answer).where(inArray(answer.id, dropped));
    }
  }
  steps.answers = String(myAnswers.length);
  steps.placeholders = String(kept.length);

  // 3. Activity entries the member caused or that point at them (their own inbox cascades with the user row).
  await tx
    .delete(notification)
    .where(
      or(
        eq(notification.actorId, userId),
        and(eq(notification.targetType, "user"), eq(notification.targetId, userId)),
      ),
    );

  // 4. The invitation that brought them (it holds their address) and any other invitation to that address.
  const email = u?.email.trim().toLowerCase();
  await tx
    .delete(invitation)
    .where(
      email
        ? or(eq(invitation.acceptedUserId, userId), eq(invitation.email, email))
        : eq(invitation.acceptedUserId, userId),
    );

  // 5. Open verification tokens (email change, reset): Better Auth keys them by user id or address. The address
  // matches whole (the identifier is the address or ends with ":<address>"), never as a substring of another
  // address (review 5.10 L2); a user id is a UUID, so a substring match on it cannot hit anyone else.
  await tx
    .delete(verification)
    .where(
      email
        ? or(
            eq(verification.value, userId),
            sql`position(${userId} in ${verification.value}) > 0`,
            sql`lower(${verification.identifier}) = ${email}`,
            sql`right(lower(${verification.identifier}), ${email.length + 1}) = ${":" + email}`,
          )
        : or(eq(verification.value, userId), sql`position(${userId} in ${verification.value}) > 0`),
    );

  // 5b. Reports about them keep the case, not the handle (review 5.10 M2): the @username is free again after the
  // purge, so a stored handle would one day name somebody else. SAFE-04 shows "—" for a missing handle.
  await tx.update(report).set({ targetHandle: null }).where(eq(report.targetOwnerId, userId));

  // 6. Feedback they sent (D-109 (6)).
  await tx.delete(feedbackReport).where(eq(feedbackReport.userId, userId));

  // 7. Feature flag audiences that name them.
  const flags = await tx
    .select({ key: featureFlag.key, audience: featureFlag.audience })
    .from(featureFlag)
    .where(sql`${featureFlag.audience} -> 'userIds' ? ${userId}`);
  for (const f of flags) {
    await tx
      .update(featureFlag)
      .set({
        audience: {
          ...f.audience,
          userIds: (f.audience.userIds ?? []).filter((x) => x !== userId),
        },
      })
      .where(eq(featureFlag.key, f.key));
  }

  // 8. The user row: sessions, sign-in methods, second factor, profile, privacy, preferences, reminder, push,
  // follows, blocks, mutes, declines, Music DNA, reactions, own Activity, settings, username reservations and data
  // copies cascade; moderation and editorial references are set to null by their foreign keys.
  await tx.delete(user).where(eq(user.id, userId));
  steps.user = "deleted";
  if (email) steps.lock = "cleared"; // see purgeDueAccounts
  return steps;
}

/** After this many failed runs a request leaves the hourly batch and waits for a person (review 5.10 L3). */
export const PURGE_MAX_FAILURES = 5;

/** One due request: erase in one transaction, then mark it completed. Returns false when it failed. */
async function purgeOne(req: { id: string; userId: string }, now: Date): Promise<boolean> {
  let email: string | undefined;
  try {
    const steps = await db().transaction(async (tx) => {
      // Lock the request so two workers never purge the same member; a cancelled one is skipped.
      const [open] = await tx
        .select({ id: deletionRequest.id })
        .from(deletionRequest)
        .where(
          and(
            eq(deletionRequest.id, req.id),
            isNull(deletionRequest.cancelledAt),
            isNull(deletionRequest.completedAt),
          ),
        )
        .for("update", { skipLocked: true });
      if (!open) return null;
      const [u] = await tx
        .select({ email: user.email, status: user.status, role: user.role })
        .from(user)
        .where(eq(user.id, req.userId));
      // Only a member still in the grace period is erased (restore sets "active" and cancels in one transaction),
      // and never one who was given a staff role meanwhile (review 5.10 L3: the role is removed first).
      if (u && u.status !== "pending_deletion") return null;
      if (u && isRole(u.role) && STAFF_ROLES.includes(u.role)) throw new Error("staff role");
      email = u?.email;
      const steps = u ? await eraseMember(tx, req.userId, now) : { user: "already-gone" };
      await tx
        .update(deletionRequest)
        .set({ completedAt: now, steps })
        .where(eq(deletionRequest.id, req.id));
      return steps;
    });
    if (!steps) return false;
    // The sign-in throttle keeps only keyed hashes; the account counter for this address goes too.
    if (email) await clearAccountLock(email);
    await audit({
      actorType: "system",
      action: "account.purged",
      targetType: "user",
      targetId: req.userId,
      metadata: { request: req.id, steps },
    });
    return true;
  } catch (e) {
    logDbError("purgeAccount", e);
    // Count the failure on the request; after PURGE_MAX_FAILURES it leaves the hourly batch (review 5.10 L3) and
    // waits for a person (the audit entry below is the alert in the alpha).
    await db()
      .update(deletionRequest)
      .set({
        steps: sql`jsonb_set(${deletionRequest.steps}, '{failures}', to_jsonb(coalesce((${deletionRequest.steps} ->> 'failures')::int, 0) + 1))`,
      })
      .where(eq(deletionRequest.id, req.id))
      .catch(() => {});
    await audit({
      actorType: "system",
      action: "account.purge.failed",
      targetType: "deletion_request",
      targetId: req.id,
    });
    return false;
  }
}

/** The worker job `account.purge`: every request whose grace period ended. Returns how many were erased. */
export async function purgeDueAccounts(now = new Date()): Promise<number> {
  const due = await db()
    .select({ id: deletionRequest.id, userId: deletionRequest.userId })
    .from(deletionRequest)
    .where(
      and(
        isNull(deletionRequest.cancelledAt),
        isNull(deletionRequest.completedAt),
        lte(deletionRequest.scheduledFor, now),
        sql`coalesce((${deletionRequest.steps} ->> 'failures')::int, 0) < ${PURGE_MAX_FAILURES}`,
      ),
    )
    .orderBy(asc(deletionRequest.scheduledFor))
    .limit(100);
  let n = 0;
  for (const req of due) if (await purgeOne(req, now)) n++;
  return n;
}
