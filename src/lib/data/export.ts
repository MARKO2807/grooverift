// The data copy (step 5.10; D-066 (2), plan §1.2 "Data export", GDPR Art. 15 and 20, D-109 (4)).
//
// A ZIP of JSON files with what GrooveRift holds about the member: account, profile and settings, Music DNA,
// answers, comments, reactions, follows, blocks, mutes, reports they made, decisions about them with their appeals,
// and feedback they sent. Never anything about another member beyond the @username of a relationship the member
// has (follows, blocks, mutes), and never who reported them (matrix: reporterIdentity).
//
// Built right after the request (the action schedules it after the response) and by the worker's sweep for
// anything left behind; the bytes live in the row for EXPORT_TTL_HOURS, then the sweep drops them. Downloads are
// for the owner only, signed in, through /api/export/<id> with a signed, expiring link (src/lib/account/download.ts).
import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";
import { and, asc, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { sendMailInBackground } from "@/lib/auth/email";
import { env } from "@/lib/env";
import {
  EXPORT_MAX_ATTEMPTS,
  EXPORT_MAX_BYTES,
  EXPORT_STALE_MINUTES,
  exportExpiry,
} from "@/lib/account/rules";
import { db } from "@/lib/db/client";
import {
  account,
  appeal,
  artist,
  block,
  comment,
  dailyDropAnswer as answer,
  dailyDropQuestion as question,
  dailyDropReminder,
  dailyDropTranslation as translation,
  dataExportRequest as request,
  enforcementAction,
  feedbackReport,
  follow,
  genre,
  memberSettings,
  musicDnaEntry,
  mute,
  notice,
  notificationPreference,
  privacySettings,
  profile,
  pushSubscription,
  reaction,
  report,
  session,
  user,
  usernameReservation,
} from "@/lib/db/schema";
import { isUniqueViolation, logDbError } from "./db-errors";
import { consume } from "./rate-limit";

export type ExportSummary = {
  id: string;
  status: "requested" | "building" | "ready" | "expired" | "failed";
  createdAt: Date;
  expiresAt: Date | null;
  sizeBytes: number | null;
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** The newest request that still means something to the member (not expired), or null. */
export async function latestExport(
  userId: string,
  now = new Date(),
): Promise<ExportSummary | null> {
  const [row] = await db()
    .select({
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
      sizeBytes: request.sizeBytes,
    })
    .from(request)
    .where(eq(request.userId, userId))
    .orderBy(desc(request.createdAt))
    .limit(1);
  if (!row) return null;
  if (row.status === "expired") return null;
  if (row.status === "ready" && row.expiresAt && row.expiresAt <= now) return null;
  return row;
}

export type RequestExportResult =
  { ok: true; id: string; fresh: boolean } | { ok: false; reason: "too-many" | "generic" };

/** "Preuzmi kopiju": one open request per member; a second tap returns the open one. */
export async function requestExport(userId: string): Promise<RequestExportResult> {
  const open = await latestExport(userId);
  if (open && (open.status === "requested" || open.status === "building"))
    return { ok: true, id: open.id, fresh: false };
  if (!(await consume("export", userId)).allowed) return { ok: false, reason: "too-many" };
  try {
    // One stored copy per member at a time (review 5.10 L5): an older ready copy is dropped for the new one.
    await db()
      .update(request)
      .set({ status: "expired", archive: null })
      .where(and(eq(request.userId, userId), eq(request.status, "ready")));
    const [row] = await db().insert(request).values({ userId }).returning({ id: request.id });
    await audit({
      actorType: "member",
      actorId: userId,
      action: "account.export.requested",
      targetType: "data_export_request",
      targetId: row!.id,
    });
    return { ok: true, id: row!.id, fresh: true };
  } catch (e) {
    if (isUniqueViolation(e)) {
      const again = await latestExport(userId);
      if (again) return { ok: true, id: again.id, fresh: false };
    }
    logDbError("requestExport", e);
    return { ok: false, reason: "generic" };
  }
}

/** The archive for a download: the owner's, ready and not expired. */
export async function exportArchive(
  userId: string,
  id: string,
  now = new Date(),
): Promise<{ archive: Buffer; createdAt: Date } | null> {
  const [row] = await db()
    .select({ archive: request.archive, createdAt: request.createdAt })
    .from(request)
    .where(
      and(
        eq(request.id, id),
        eq(request.userId, userId),
        eq(request.status, "ready"),
        gt(request.expiresAt, now),
      ),
    );
  if (!row?.archive) return null;
  return { archive: row.archive, createdAt: row.createdAt };
}

// ============================================================ Building

/** Everything the copy contains, file by file. Read in one go; alpha accounts are small. */
export async function collectMemberData(userId: string): Promise<Record<string, unknown> | null> {
  const [u] = await db()
    .select({
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      locale: user.locale,
      twoFactorEnabled: user.twoFactorEnabled,
      role: user.role,
      status: user.status,
    })
    .from(user)
    .where(eq(user.id, userId));
  if (!u) return null;

  const [methods, sessions, [p], [privacy], [ms], prefs, [reminder], devices] = await Promise.all([
    db()
      .select({ provider: account.providerId, createdAt: account.createdAt })
      .from(account)
      .where(eq(account.userId, userId)),
    db()
      .select({
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(eq(session.userId, userId)),
    db().select().from(profile).where(eq(profile.userId, userId)),
    db().select().from(privacySettings).where(eq(privacySettings.userId, userId)),
    db().select().from(memberSettings).where(eq(memberSettings.userId, userId)),
    db()
      .select({
        type: notificationPreference.type,
        channel: notificationPreference.channel,
        enabled: notificationPreference.enabled,
      })
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, userId)),
    db().select().from(dailyDropReminder).where(eq(dailyDropReminder.userId, userId)),
    // Push devices (step 5.12): what the member can recognise; never the endpoint or the keys.
    db()
      .select({
        deviceLabel: pushSubscription.deviceLabel,
        createdAt: pushSubscription.createdAt,
        pausedUntil: pushSubscription.pausedUntil,
        lastSuccessAt: pushSubscription.lastSuccessAt,
      })
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, userId)),
  ]);

  const dna = await db()
    .select({
      kind: musicDnaEntry.kind,
      position: musicDnaEntry.position,
      createdAt: musicDnaEntry.createdAt,
      genreHr: genre.nameHr,
      genreEn: genre.nameEn,
      genreMbid: genre.mbid,
      artistName: artist.name,
      artistMbid: artist.mbid,
    })
    .from(musicDnaEntry)
    .leftJoin(genre, eq(genre.id, musicDnaEntry.genreId))
    .leftJoin(artist, eq(artist.id, musicDnaEntry.artistId))
    .where(eq(musicDnaEntry.userId, userId))
    .orderBy(asc(musicDnaEntry.kind), asc(musicDnaEntry.position));

  const locale = p?.interfaceLocale === "en" ? "en" : "hr";
  const questionText = sql<string | null>`(select ${translation.text} from ${translation}
    where ${translation.questionId} = ${question.id} and ${translation.locale} = ${locale})`;

  const answers = await db()
    .select({
      id: answer.id,
      date: question.publishDate,
      question: questionText,
      body: answer.body,
      language: answer.language,
      createdAt: answer.createdAt,
      editedAt: answer.editedAt,
      deletedAt: answer.deletedAt,
      removedAt: answer.removedAt,
    })
    .from(answer)
    .innerJoin(question, eq(question.id, answer.questionId))
    .where(eq(answer.authorId, userId))
    .orderBy(asc(answer.createdAt));

  const comments = await db()
    .select({
      id: comment.id,
      answerId: comment.answerId,
      date: question.publishDate,
      question: questionText,
      body: comment.body,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
      deletedAt: comment.deletedAt,
      removedAt: comment.removedAt,
    })
    .from(comment)
    .innerJoin(answer, eq(answer.id, comment.answerId))
    .innerJoin(question, eq(question.id, answer.questionId))
    .where(eq(comment.authorId, userId))
    .orderBy(asc(comment.createdAt));

  const reactions = await db()
    .select({
      targetType: reaction.targetType,
      targetId: reaction.targetId,
      createdAt: reaction.createdAt,
    })
    .from(reaction)
    .where(eq(reaction.userId, userId))
    .orderBy(asc(reaction.createdAt));

  // Relationships with the other member's @username only (no other personal data of theirs).
  const handle = async (ids: string[]) => {
    if (!ids.length) return new Map<string, string>();
    const rows = await db()
      .select({ id: profile.userId, username: profile.username })
      .from(profile)
      .where(inArray(profile.userId, [...new Set(ids)]));
    return new Map(rows.map((r) => [r.id, r.username]));
  };
  const [following, followers, blocks, mutes] = await Promise.all([
    db()
      .select({ id: follow.followeeId, status: follow.status, createdAt: follow.createdAt })
      .from(follow)
      .where(eq(follow.followerId, userId)),
    db()
      .select({ id: follow.followerId, status: follow.status, createdAt: follow.createdAt })
      .from(follow)
      .where(eq(follow.followeeId, userId)),
    db()
      .select({ id: block.blockedId, createdAt: block.createdAt })
      .from(block)
      .where(eq(block.blockerId, userId)),
    db()
      .select({ id: mute.mutedId, createdAt: mute.createdAt })
      .from(mute)
      .where(eq(mute.muterId, userId)),
  ]);
  const names = await handle([...following, ...followers, ...blocks, ...mutes].map((r) => r.id));
  const rel = <T extends { id: string; createdAt: Date }>(rows: T[]) =>
    rows
      .filter((r) => names.has(r.id))
      .map(({ id, createdAt, ...rest }) => ({
        username: names.get(id)!,
        ...rest,
        since: iso(createdAt),
      }));

  const reports = await db()
    .select({
      targetType: report.targetType,
      reportedAccount: report.targetHandle,
      category: report.category,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt,
    })
    .from(report)
    .where(eq(report.reporterId, userId))
    .orderBy(asc(report.createdAt));

  const decisions = await db()
    .select({
      id: enforcementAction.id,
      kind: enforcementAction.kind,
      targetType: enforcementAction.targetType,
      statementOfReasons: enforcementAction.statementOfReasons,
      ruleRef: enforcementAction.ruleRef,
      startsAt: enforcementAction.startsAt,
      endsAt: enforcementAction.endsAt,
      revokedAt: enforcementAction.revokedAt,
      appealUntil: enforcementAction.appealUntil,
    })
    .from(enforcementAction)
    .where(eq(enforcementAction.subjectUserId, userId))
    .orderBy(asc(enforcementAction.startsAt));
  const appeals = await db()
    .select({
      decision: appeal.actionId,
      text: appeal.text,
      status: appeal.status,
      outcome: appeal.outcomeText,
      createdAt: appeal.createdAt,
      decidedAt: appeal.decidedAt,
    })
    .from(appeal)
    .where(eq(appeal.appellantId, userId));

  const feedback = await db()
    .select({
      kind: feedbackReport.kind,
      text: feedbackReport.text,
      context: feedbackReport.context,
      replyByEmail: feedbackReport.replyByEmail,
      status: feedbackReport.status,
      createdAt: feedbackReport.createdAt,
    })
    .from(feedbackReport)
    .where(eq(feedbackReport.userId, userId));

  // Review 5.10 L6: DSA notices the member sent through PUB-11, and their reserved former usernames.
  const notices = await db()
    .select({
      category: notice.category,
      url: notice.url,
      explanation: notice.explanation,
      name: notice.notifierName,
      email: notice.notifierEmail,
      status: notice.status,
      createdAt: notice.createdAt,
    })
    .from(notice)
    .where(eq(notice.submittedBy, userId));
  const reservations = await db()
    .select({
      username: usernameReservation.username,
      reservedUntil: usernameReservation.reservedUntil,
    })
    .from(usernameReservation)
    .where(eq(usernameReservation.userId, userId));

  const stamp = (rows: Record<string, unknown>[]) =>
    rows.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? iso(v) : v])),
    );

  return {
    "account.json": {
      email: u.email,
      name: u.name,
      createdAt: iso(u.createdAt),
      interfaceLanguage: u.locale,
      status: u.status,
      role: u.role ?? "member",
      twoFactorEnabled: !!u.twoFactorEnabled,
      signInMethods: stamp(methods),
      devices: stamp(sessions),
    },
    "profile.json": p
      ? {
          username: p.username,
          displayName: p.displayName,
          bio: p.bio,
          visibility: p.visibility,
          discoverable: p.discoverable,
          interfaceLanguage: p.interfaceLocale,
          readingLanguages: p.readingLanguages,
          timeZone: p.timeZone,
          onboardedAt: iso(p.onboardedAt),
          usernameChangedAt: iso(p.usernameChangedAt),
          reservedFormerUsernames: stamp(reservations),
          createdAt: iso(p.createdAt),
        }
      : null,
    "settings.json": {
      privacy: privacy
        ? { musicDna: privacy.musicDna, lists: privacy.lists, dropHistory: privacy.dropHistory }
        : null,
      reduceMotion: ms?.reduceMotion ?? false,
      notifications: prefs,
      dailyDropReminder: reminder
        ? {
            enabled: reminder.enabled,
            localTime: reminder.localTime,
            timeZone: reminder.timeZone,
            lastRemindedOn: reminder.lastRemindedOn,
          }
        : null,
      pushDevices: devices.map((d) => ({
        device: d.deviceLabel,
        createdAt: iso(d.createdAt),
        pausedUntil: iso(d.pausedUntil),
        lastDelivery: iso(d.lastSuccessAt),
      })),
    },
    "music-dna.json": dna.map((d) =>
      d.kind === "genre"
        ? {
            kind: "genre",
            position: d.position,
            name: d.genreEn,
            nameHr: d.genreHr,
            musicbrainzId: d.genreMbid,
          }
        : { kind: "artist", position: d.position, name: d.artistName, musicbrainzId: d.artistMbid },
    ),
    "answers.json": stamp(answers),
    "comments.json": stamp(comments),
    "reactions.json": stamp(reactions),
    "follows.json": { following: rel(following), followers: rel(followers) },
    "blocks.json": rel(blocks),
    "mutes.json": rel(mutes),
    "reports.json": stamp(reports),
    "decisions.json": { decisions: stamp(decisions), appeals: stamp(appeals) },
    "feedback.json": stamp(feedback),
    "notices.json": stamp(notices),
  };
}

const README = `GrooveRift: kopija tvojih podataka / a copy of your data

HR
Ova ZIP datoteka sadrži podatke koje GrooveRift čuva o tvom računu, u JSON formatu:
account.json (adresa, načini prijave, uređaji), profile.json, settings.json (privatnost, obavijesti, podsjetnik),
music-dna.json, answers.json, comments.json, reactions.json, follows.json, blocks.json, mutes.json,
reports.json (tvoje prijave), notices.json (prijave nezakonitog sadržaja), decisions.json (odluke moderacije o tebi i tvoje žalbe), feedback.json.
Drugi članovi navedeni su samo korisničkim imenom. Tko je prijavio tvoj sadržaj ne piše nigdje.
Pitanja: kontakt za privatnost u aplikaciji (Postavke → O GrooveRiftu).

EN
This ZIP file holds the data GrooveRift keeps about your account, as JSON:
account.json (address, sign-in methods, devices), profile.json, settings.json (privacy, notifications, reminder),
music-dna.json, answers.json, comments.json, reactions.json, follows.json, blocks.json, mutes.json,
reports.json (reports you sent), notices.json (illegal-content notices), decisions.json (moderation decisions about you and your appeals), feedback.json.
Other members appear by @username only. Who reported your content is never included.
Questions: the privacy contact in the app (Settings → About GrooveRift).
`;

/** Zips the files in memory. */
export async function zipFiles(files: Record<string, unknown>, at: Date): Promise<Buffer> {
  const zip = new ZipArchive({ zlib: { level: 9 } });
  const out = new PassThrough();
  const chunks: Buffer[] = [];
  out.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    out.on("end", resolve);
    out.on("error", reject);
    zip.on("error", reject);
  });
  zip.pipe(out);
  zip.append(README, { name: "README.txt", date: at });
  for (const [name, value] of Object.entries(files))
    zip.append(JSON.stringify(value, null, 2) + "\n", { name, date: at });
  await zip.finalize();
  await done;
  return Buffer.concat(chunks);
}

/**
 * Builds one request: claims it (requested, or building and stale), zips, stores. Safe to call twice at once:
 * only one claim wins. Returns the final status, or null when nothing was claimed.
 */
export async function buildExport(
  id: string,
  now = new Date(),
): Promise<ExportSummary["status"] | null> {
  const stale = new Date(now.getTime() - EXPORT_STALE_MINUTES * 60_000);
  const [claimed] = await db()
    .update(request)
    // completed_at doubles as "claimed at" while building, so a stuck build can be told from a running one.
    .set({ status: "building", attempts: sql`${request.attempts} + 1`, completedAt: now })
    .where(
      and(
        eq(request.id, id),
        or(
          eq(request.status, "requested"),
          and(eq(request.status, "building"), lt(request.completedAt, stale)),
        ),
      ),
    )
    .returning({ userId: request.userId, attempts: request.attempts });
  if (!claimed) return null;
  try {
    const files = await collectMemberData(claimed.userId);
    if (!files) throw new Error("member gone");
    const archive = await zipFiles(files, now);
    if (archive.length > EXPORT_MAX_BYTES) throw new Error("export too large");
    await db()
      .update(request)
      .set({
        status: "ready",
        archive,
        sizeBytes: archive.length,
        completedAt: now,
        expiresAt: exportExpiry(now),
      })
      .where(eq(request.id, id));
    await audit({
      actorType: "system",
      action: "account.export.ready",
      targetType: "data_export_request",
      targetId: id,
      metadata: { bytes: archive.length },
    });
    const email = (files["account.json"] as { email?: string } | null)?.email;
    if (email)
      sendMailInBackground(
        {
          to: email,
          subject: "GrooveRift: kopija podataka je spremna / your data copy is ready",
          text: `Kopija tvojih podataka je spremna. Preuzmi je u sljedeća 24 sata, nakon prijave u svoj račun:
${env().APP_URL}/settings/data

Your data copy is ready. Download it within 24 hours while signed in:
${env().APP_URL}/en/settings/data

Ako to nisi ti, promijeni lozinku. / If you did not ask for it, change your password.`,
        },
        "export-ready",
      );
    return "ready";
  } catch (e) {
    logDbError("buildExport", e);
    const failed = claimed.attempts >= EXPORT_MAX_ATTEMPTS;
    await db()
      .update(request)
      .set({ status: failed ? "failed" : "requested" })
      .where(eq(request.id, id));
    if (failed)
      await audit({
        actorType: "system",
        action: "account.export.failed",
        targetType: "data_export_request",
        targetId: id,
      });
    return failed ? "failed" : "requested";
  }
}

/**
 * The worker's sweep (`account.export`): builds anything left "requested" or stuck in "building", and drops the
 * bytes of copies whose 24 hours are over. Returns what it did.
 */
export async function sweepExports(now = new Date()): Promise<{ built: number; expired: number }> {
  const stale = new Date(now.getTime() - EXPORT_STALE_MINUTES * 60_000);
  const waiting = await db()
    .select({ id: request.id })
    .from(request)
    .where(
      or(
        eq(request.status, "requested"),
        and(eq(request.status, "building"), lt(request.completedAt, stale)),
      ),
    )
    .limit(50);
  let built = 0;
  for (const r of waiting) if ((await buildExport(r.id, now)) === "ready") built++;
  const expired = await db()
    .update(request)
    .set({ status: "expired", archive: null })
    .where(and(eq(request.status, "ready"), lt(request.expiresAt, now)))
    .returning({ id: request.id });
  return { built, expired: expired.length };
}
