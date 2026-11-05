// The publication around the data layer (step 5.6, J6): audit every outcome and tell staff by email when
// something needs a human (J6 E8: a one-person team must hear about it outside ADM-01). Used by the worker's
// jobs and by "Publish now". Alert emails name dates and counts only, never a member or a question's text.
import type { Mail } from "@/lib/auth/email";
import { sendMail } from "@/lib/auth/email";
import { audit } from "@/lib/audit";
import {
  editorialHealth,
  markScheduledFailed,
  PublicationError,
  publishForDate,
  staffAlertRecipients,
  type EditorialHealth,
  type PublishOutcome,
} from "@/lib/data/editorial";
import { dbErrorSummary } from "@/lib/data/db-errors";
import { env } from "@/lib/env";
import { RESERVE_LOW, type DropLocale } from "./rules";

export type AlertKind =
  "reserve_used" | "question_skipped" | "no_question" | "publish_failed" | "warnings";
export type AlertInfo = { date?: string; gaps?: string[]; reserve?: number; stale?: string[] };

const path = (kind: AlertKind) =>
  kind === "warnings" ? "/admin/editorial" : "/admin/editorial/jobs";

export function alertMail(
  to: string,
  locale: DropLocale,
  kind: AlertKind,
  info: AlertInfo,
  appUrl: string,
): Mail {
  const link = `${appUrl}${locale === "en" ? "/en" : ""}${path(kind)}`;
  const date = info.date ?? "";
  const gaps = (info.gaps ?? []).join(", ");
  const stale = (info.stale ?? []).join(", ");
  if (locale === "en") {
    const lines: Record<AlertKind, [string, string]> = {
      reserve_used: [
        `Daily Drop ${date}: a reserve question was used`,
        `No question was scheduled for ${date} (UTC), so the oldest reserve question went out. Replace it in the reserve.`,
      ],
      question_skipped: [
        `Daily Drop ${date}: the scheduled question was skipped`,
        `The question scheduled for ${date} (UTC) did not have both languages approved. It is back among the approved questions without a date, and a reserve question went out instead.`,
      ],
      no_question: [
        `Critical: no Daily Drop for ${date}`,
        `There was no scheduled question for ${date} (UTC) and the reserve is empty. Members see "today's question is on its way". Approve a question and use "Publish now".`,
      ],
      publish_failed: [
        `Critical: the Daily Drop for ${date} failed`,
        `Publishing ${date} (UTC) failed after every retry. Check the jobs page and use "Publish now".`,
      ],
      warnings: [
        "Daily Drop: the plan needs attention",
        [
          stale ? `Still scheduled but never published: ${stale} (UTC).` : "",
          gaps ? `No question scheduled for: ${gaps} (UTC).` : "",
          (info.reserve ?? RESERVE_LOW) < RESERVE_LOW
            ? `The reserve has ${info.reserve} questions (fewer than ${RESERVE_LOW}).`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ],
    };
    const [subject, body] = lines[kind];
    return { to, subject: `GrooveRift: ${subject}`, text: `${body}\n\n${link}` };
  }
  const lines: Record<AlertKind, [string, string]> = {
    reserve_used: [
      `Daily Drop ${date}: iskorišteno je pitanje iz rezerve`,
      `Za ${date} (UTC) nije bilo zakazanog pitanja pa je objavljeno najstarije pitanje iz rezerve. Nadopuni rezervu.`,
    ],
    question_skipped: [
      `Daily Drop ${date}: zakazano pitanje je preskočeno`,
      `Pitanje zakazano za ${date} (UTC) nije imalo odobrena oba jezika. Vraćeno je među odobrena pitanja bez datuma, a umjesto njega objavljeno je pitanje iz rezerve.`,
    ],
    no_question: [
      `Hitno: nema Daily Dropa za ${date}`,
      `Za ${date} (UTC) nije bilo zakazanog pitanja, a rezerva je prazna. Članovi vide „današnje pitanje stiže uskoro”. Odobri pitanje i pokreni „Objavi sada”.`,
    ],
    publish_failed: [
      `Hitno: objava Daily Dropa za ${date} nije uspjela`,
      `Objava za ${date} (UTC) nije uspjela ni nakon svih ponovnih pokušaja. Pogledaj stranicu objava i pokreni „Objavi sada”.`,
    ],
    warnings: [
      "Daily Drop: plan traži pažnju",
      [
        stale ? `Još zakazano, a nikad objavljeno: ${stale} (UTC).` : "",
        gaps ? `Nema zakazanog pitanja za: ${gaps} (UTC).` : "",
        (info.reserve ?? RESERVE_LOW) < RESERVE_LOW
          ? `U rezervi je ${info.reserve} pitanja (manje od ${RESERVE_LOW}).`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ],
  };
  const [subject, body] = lines[kind];
  return { to, subject: `GrooveRift: ${subject}`, text: `${body}\n\n${link}` };
}

/** Emails every editor and admin; one failed send does not stop the others. Audited with counts only. */
export async function sendStaffAlert(kind: AlertKind, info: AlertInfo): Promise<void> {
  const recipients = await staffAlertRecipients();
  const appUrl = env().APP_URL;
  let sent = 0;
  for (const r of recipients) {
    try {
      await sendMail(alertMail(r.email, r.locale, kind, info, appUrl));
      sent++;
    } catch (error) {
      console.error("[editorial alert]", kind, error instanceof Error ? error.message : error);
    }
  }
  await audit({
    actorType: "system",
    action: "editorial.alert",
    metadata: { kind, date: info.date ?? null, recipients: recipients.length, sent },
  });
  if (sent < recipients.length)
    await audit({ actorType: "system", action: "mail.failed", metadata: { kind: "editorial" } });
}

/**
 * One publication attempt with its audit and alerts. Alerts go out for the scheduled job only: "Publish now"
 * answers the editor on the page. A failure is rethrown so pg-boss retries; staff hear about it on the last try,
 * also when the error struck outside the publication's savepoint (a dropped connection, the lock, the run row:
 * review 5.6 #1), in which case the scheduled question is marked failed here.
 */
export async function runPublication(
  date: string,
  opts: { trigger: "schedule" | "manual"; actorId?: string | null; final?: boolean },
): Promise<PublishOutcome> {
  const actor =
    opts.trigger === "manual"
      ? { actorType: "staff" as const, actorId: opts.actorId ?? null }
      : { actorType: "system" as const };
  const scheduled = opts.trigger === "schedule";
  let outcome: PublishOutcome;
  try {
    outcome = await publishForDate(date, { final: opts.final, allowRefill: !scheduled });
  } catch (error) {
    const recorded = error instanceof PublicationError;
    await audit({
      ...actor,
      action: "daily_drop.publish.failed",
      metadata: {
        date,
        attempt: recorded ? error.attempt : null,
        code: recorded ? null : dbErrorSummary(error),
        trigger: opts.trigger,
        final: !!opts.final,
      },
    });
    if (scheduled && opts.final) {
      if (!recorded) await markScheduledFailed(date).catch(() => undefined);
      await sendStaffAlert("publish_failed", { date }).catch((e) =>
        console.error("[editorial alert]", e instanceof Error ? e.message : e),
      );
    }
    throw error;
  }
  switch (outcome.status) {
    case "published":
      await audit({
        ...actor,
        action: "daily_drop.published",
        targetType: "daily_drop_question",
        targetId: outcome.questionId,
        metadata: {
          date,
          trigger: opts.trigger,
          attempt: outcome.attempt,
          usedReserve: outcome.usedReserve,
          skipped: outcome.skippedQuestionId,
        },
      });
      if (scheduled && outcome.skippedQuestionId)
        await sendStaffAlert("question_skipped", { date });
      else if (scheduled && outcome.usedReserve) await sendStaffAlert("reserve_used", { date });
      break;
    case "empty":
      await audit({
        ...actor,
        action: "daily_drop.publish.empty",
        metadata: { date, trigger: opts.trigger, attempt: outcome.attempt },
      });
      if (scheduled) await sendStaffAlert("no_question", { date });
      break;
    case "paused":
      await audit({
        ...actor,
        action: "daily_drop.publish.paused",
        metadata: { date, trigger: opts.trigger },
      });
      break;
    case "withdrawn":
    case "already":
      break;
  }
  return outcome;
}

/** The daily look ahead (JO4): emails staff when a date within 72 hours is empty or the reserve is low. */
export async function dailyCheck(now: Date = new Date()): Promise<EditorialHealth> {
  const health = await editorialHealth(now);
  if (health.gaps.length || health.reserveLow || health.stale.length) {
    await sendStaffAlert("warnings", {
      gaps: health.gaps,
      reserve: health.reserve,
      stale: health.stale,
    });
  }
  return health;
}
