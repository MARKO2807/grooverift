"use server";

import { getSession, roleOf } from "@/lib/auth/session";
import type { Viewer } from "@/lib/authz";
import {
  createAnswer,
  createComment,
  deleteOwnAnswer,
  deleteOwnComment,
  editOwnAnswer,
  setReaction,
  visibleAnswerCount,
} from "@/lib/data/answers";
import { logDbError } from "@/lib/data/db-errors";
import { latestPublishedDate } from "@/lib/data/drops";
import { loadViewer } from "@/lib/data/facts";
import { consume } from "@/lib/data/rate-limit";
import { flagState } from "@/lib/flags";
import { ANSWER_MAX, COMMENT_MAX, type DropFailure } from "./rules";

// Server actions for the Daily Drop (HUB-02, HUB-03; step 5.7, J3). The member always comes from the session
// with fresh facts (loadViewer), never from the client; ids are checked for shape here and again in the data
// layer, which asks the policy. A paused feature (SYS-04) refuses new content, while deleting own content stays
// possible. Every failure comes back as a reason key for the component's messages, never as an exception text;
// hidden or blocked targets answer like missing ones.

export type DropResult = { ok: true; id?: string } | { ok: false; reason: DropFailure };
export type ReactResult =
  { ok: true; reacted: boolean; count: number } | { ok: false; reason: DropFailure };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Member = { viewer: Viewer & { id: string } } | { fail: DropFailure };

/** The signed-in, active, onboarded member; `paused` names the flags that must not be paused for this write. */
async function member(paused: ("daily_drop" | "comments")[]): Promise<Member> {
  const session = await getSession();
  if (!session) return { fail: "signedOut" };
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  if (!viewer.id || viewer.status !== "active" || viewer.onboarded === false)
    return { fail: "notAllowed" };
  for (const key of paused) if ((await flagState(key)) === "paused") return { fail: "paused" };
  return { viewer: viewer as Viewer & { id: string } };
}

function checkText(body: unknown, max: number): DropFailure | null {
  if (typeof body !== "string") return "empty";
  const text = body.trim();
  if (!text) return "empty";
  if (text.length > max) return "tooLong";
  return null;
}

async function guarded<T>(where: string, run: () => Promise<T>, failed: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    logDbError(where, e);
    return failed;
  }
}

const GENERIC = { ok: false, reason: "generic" } as const;

const mapReason = (r: string): DropFailure =>
  r === "restricted"
    ? "restricted"
    : r === "already-answered"
      ? "alreadyAnswered"
      : r === "too-many"
        ? "tooMany"
        : r === "not-allowed"
          ? "notAllowed"
          : "notAvailable";

/** Post an answer to the question that was on screen (the composer carries its id, J3 E1). */
export async function postAnswerAction(questionId: string, body: string): Promise<DropResult> {
  if (typeof questionId !== "string" || !UUID.test(questionId))
    return { ok: false, reason: "notAvailable" };
  const bad = checkText(body, ANSWER_MAX);
  if (bad) return { ok: false, reason: bad };
  return guarded<DropResult>(
    "postAnswer",
    async () => {
      const m = await member(["daily_drop"]);
      if ("fail" in m) return { ok: false, reason: m.fail };
      const r = await createAnswer(m.viewer, questionId, body);
      return r.ok ? { ok: true, id: r.id } : { ok: false, reason: mapReason(r.reason) };
    },
    GENERIC,
  );
}

export async function editAnswerAction(answerId: string, body: string): Promise<DropResult> {
  if (typeof answerId !== "string" || !UUID.test(answerId))
    return { ok: false, reason: "notAvailable" };
  const bad = checkText(body, ANSWER_MAX);
  if (bad) return { ok: false, reason: bad };
  return guarded<DropResult>(
    "editAnswer",
    async () => {
      const m = await member(["daily_drop"]);
      if ("fail" in m) return { ok: false, reason: m.fail };
      const r = await editOwnAnswer(m.viewer, answerId, body);
      return r.ok ? { ok: true } : { ok: false, reason: mapReason(r.reason) };
    },
    GENERIC,
  );
}

export async function deleteAnswerAction(answerId: string): Promise<DropResult> {
  if (typeof answerId !== "string" || !UUID.test(answerId))
    return { ok: false, reason: "notAvailable" };
  return guarded<DropResult>(
    "deleteAnswer",
    async () => {
      const m = await member([]);
      if ("fail" in m) return { ok: false, reason: m.fail };
      if (!(await consume("contentEdit", m.viewer.id)).allowed)
        return { ok: false, reason: "tooMany" };
      return (await deleteOwnAnswer(m.viewer.id, answerId))
        ? { ok: true }
        : { ok: false, reason: "notAvailable" };
    },
    GENERIC,
  );
}

export async function postCommentAction(answerId: string, body: string): Promise<DropResult> {
  if (typeof answerId !== "string" || !UUID.test(answerId))
    return { ok: false, reason: "notAvailable" };
  const bad = checkText(body, COMMENT_MAX);
  if (bad) return { ok: false, reason: bad };
  return guarded<DropResult>(
    "postComment",
    async () => {
      const m = await member(["daily_drop", "comments"]);
      if ("fail" in m) return { ok: false, reason: m.fail };
      const r = await createComment(m.viewer, answerId, body);
      return r.ok ? { ok: true, id: r.id } : { ok: false, reason: mapReason(r.reason) };
    },
    GENERIC,
  );
}

export async function deleteCommentAction(commentId: string): Promise<DropResult> {
  if (typeof commentId !== "string" || !UUID.test(commentId))
    return { ok: false, reason: "notAvailable" };
  return guarded<DropResult>(
    "deleteComment",
    async () => {
      const m = await member([]);
      if ("fail" in m) return { ok: false, reason: m.fail };
      const r = await deleteOwnComment(m.viewer, commentId);
      return r.ok ? { ok: true } : { ok: false, reason: mapReason(r.reason) };
    },
    GENERIC,
  );
}

export async function reactAction(answerId: string, on: boolean): Promise<ReactResult> {
  if (typeof answerId !== "string" || !UUID.test(answerId) || typeof on !== "boolean")
    return { ok: false, reason: "notAvailable" };
  return guarded<ReactResult>(
    "react",
    async () => {
      const m = await member(["daily_drop"]);
      if ("fail" in m) return { ok: false, reason: m.fail };
      const r = await setReaction(m.viewer, answerId, on);
      return r.ok ? r : { ok: false, reason: mapReason(r.reason) };
    },
    GENERIC,
  );
}

/**
 * The open question page asks once a minute (J3 E1, E3): how many answers the viewer can see now, and the newest
 * published date, so the page can offer "N new answers" and "A new Daily Drop is out" without moving anything.
 */
export async function pollDropAction(
  questionId: string,
): Promise<{ ok: true; count: number; latest: string | null } | { ok: false }> {
  if (typeof questionId !== "string" || !UUID.test(questionId)) return { ok: false };
  return guarded<{ ok: true; count: number; latest: string | null } | { ok: false }>(
    "pollDrop",
    async () => {
      const session = await getSession();
      if (!session) return { ok: false };
      const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
      if (!(await consume("dropPoll", session.user.id)).allowed) return { ok: false };
      const [count, latest] = await Promise.all([
        visibleAnswerCount(viewer, questionId),
        latestPublishedDate(),
      ]);
      return { ok: true, count, latest };
    },
    { ok: false },
  );
}
