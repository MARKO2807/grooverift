"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { audit } from "@/lib/audit";
import { Forbidden, requireRole, roleOf, Unauthenticated } from "@/lib/auth/session";
import type { FormState } from "@/lib/auth/actions";
import {
  createQuestion,
  deleteQuestion,
  mayEdit,
  PublicationError,
  saveQuestion,
  transition,
  withdrawQuestion,
  type EditorialResult,
  type Transition,
} from "@/lib/data/editorial";
import { loadViewer } from "@/lib/data/facts";
import { consume } from "@/lib/data/rate-limit";
import { runPublication } from "./publication";
import { APPROVE_CHECKLIST, isIsoDate, utcDate } from "./rules";

// Editorial actions (ADM-04, ADM-05, ADM-09; step 5.6). The role is checked here on every call (the pages only
// hide); loadViewer applies the second-factor rule and the data layer asks the policy again. Error values are
// keys under admin.editorial.errors.

export type EditorialState = FormState & {
  /** J6 E2: the version someone else saved, shown beside the editor's own text. */
  conflict?: { hr: string; en: string; version: number };
  /** "Publish now": what happened, a key under admin.editorial.jobs.outcome. */
  outcome?: string;
};

// i18n-keys: admin.editorial.errors.forbidden admin.editorial.errors.notFound admin.editorial.errors.state admin.editorial.errors.incomplete admin.editorial.errors.invalid admin.editorial.errors.dateTaken admin.editorial.errors.datePast admin.editorial.errors.tooBig admin.editorial.errors.conflict admin.editorial.errors.tooMany admin.editorial.errors.generic admin.editorial.errors.freshSession admin.editorial.errors.checklist admin.editorial.errors.timeless admin.editorial.errors.confirm admin.editorial.errors.reason admin.editorial.errors.paused admin.editorial.errors.empty admin.editorial.errors.publishFailed admin.editorial.errors.empty_text
const REASON_KEYS: Record<string, string> = {
  forbidden: "forbidden",
  "not-found": "notFound",
  state: "state",
  incomplete: "incomplete",
  invalid: "invalid",
  "date-taken": "dateTaken",
  "date-past": "datePast",
  "too-big": "tooBig",
  conflict: "conflict",
};

/** The editor's fresh facts; throws for anyone who is not an editor or admin with a second factor. */
async function editor() {
  const session = await requireRole("editor", "admin");
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  return { session, viewer, id: session.user.id };
}

function guard(error: unknown): EditorialState {
  if (error instanceof Unauthenticated) return { error: "freshSession" };
  if (error instanceof Forbidden) return { error: "forbidden" };
  console.error("[editorial action]", error instanceof Error ? error.message : error);
  return { error: "generic" };
}

function refused(r: Extract<EditorialResult, { ok: false }>, values?: Record<string, string>) {
  const state: EditorialState = { error: REASON_KEYS[r.reason] ?? "generic", values };
  if (r.reason === "conflict") {
    state.conflict = {
      hr: r.current.hr?.text ?? "",
      en: r.current.en?.text ?? "",
      version: r.current.version,
    };
  }
  return state;
}

const revalidate = () => revalidatePath("/[locale]/admin", "layout");
const texts = (form: FormData) => ({
  hr: String(form.get("hr") ?? ""),
  en: String(form.get("en") ?? ""),
});
const ref = z.object({ id: z.uuid(), version: z.coerce.number().int().positive() });

async function limited(userId: string) {
  return !(await consume("editorial", userId)).allowed;
}

/** ADM-05: a new question in one or both languages; then to its page. */
export async function createQuestionAction(
  _prev: EditorialState,
  form: FormData,
): Promise<EditorialState> {
  const values = texts(form);
  let target: string;
  try {
    const { viewer, id } = await editor();
    if (await limited(id)) return { error: "tooMany", values };
    const r = await createQuestion(viewer, values);
    if (!r.ok) return r.reason === "invalid" ? { error: "empty_text", values } : refused(r, values);
    await audit({
      actorType: "staff",
      actorId: id,
      action: "editorial.question.created",
      targetType: "daily_drop_question",
      targetId: r.id,
    });
    target = r.id;
  } catch (error) {
    return guard(error);
  }
  revalidate();
  redirect({ href: `/admin/editorial/drops/${target}?created=1`, locale: await getLocale() });
  return {};
}

/** ADM-05: saves both texts against the version the editor opened (J6 E2). */
export async function saveQuestionAction(
  _prev: EditorialState,
  form: FormData,
): Promise<EditorialState> {
  const values = texts(form);
  const parsed = ref.safeParse({ id: form.get("id"), version: form.get("version") });
  if (!parsed.success) return { error: "generic", values };
  try {
    const { viewer, id } = await editor();
    if (await limited(id)) return { error: "tooMany", values };
    const r = await saveQuestion(viewer, { ...parsed.data, texts: values });
    if (!r.ok) return r.reason === "invalid" ? { error: "empty_text", values } : refused(r, values);
    if (r.version !== parsed.data.version)
      await audit({
        actorType: "staff",
        actorId: id,
        action: "editorial.question.saved",
        targetType: "daily_drop_question",
        targetId: r.id,
      });
    revalidate();
    return { ok: true, values };
  } catch (error) {
    return guard(error);
  }
}

const MOVES = [
  "submit",
  "requestChanges",
  "approve",
  "schedule",
  "unschedule",
  "reserve",
  "unreserve",
  "toDraft",
] as const;

/** The lifecycle buttons of ADM-05 (J6): each a small form with the question's id and version. */
export async function transitionAction(
  _prev: EditorialState,
  form: FormData,
): Promise<EditorialState> {
  const parsed = ref
    .extend({ to: z.enum(MOVES) })
    .safeParse({ id: form.get("id"), version: form.get("version"), to: form.get("to") });
  if (!parsed.success) return { error: "generic" };
  const { to } = parsed.data;
  let move: Transition;
  switch (to) {
    case "approve": {
      const checklist = APPROVE_CHECKLIST.every((k) => form.get(`check_${k}`) === "on");
      if (!checklist) return { error: "checklist" };
      move = { to, checklist };
      break;
    }
    case "reserve":
      if (form.get("timeless") !== "on") return { error: "timeless" };
      move = { to, timeless: true };
      break;
    case "schedule": {
      const date = form.get("date");
      if (!isIsoDate(date)) return { error: "invalid", values: { date: String(date ?? "") } };
      move = { to, date };
      break;
    }
    default:
      move = { to };
  }
  try {
    const { viewer, id } = await editor();
    if (await limited(id)) return { error: "tooMany" };
    const r = await transition(viewer, {
      id: parsed.data.id,
      version: parsed.data.version,
      ...move,
    });
    if (!r.ok) return refused(r, move.to === "schedule" ? { date: move.date } : undefined);
    await audit({
      actorType: "staff",
      actorId: id,
      action: `editorial.question.${to}`,
      targetType: "daily_drop_question",
      targetId: r.id,
      metadata: move.to === "schedule" ? { date: move.date } : {},
    });
    revalidate();
    return { ok: true, outcome: to };
  } catch (error) {
    return guard(error);
  }
}

export async function deleteQuestionAction(
  _prev: EditorialState,
  form: FormData,
): Promise<EditorialState> {
  const parsed = ref.safeParse({ id: form.get("id"), version: form.get("version") });
  if (!parsed.success) return { error: "generic" };
  if (form.get("confirm") !== "on") return { error: "confirm" };
  try {
    const { viewer, id } = await editor();
    if (await limited(id)) return { error: "tooMany" };
    const r = await deleteQuestion(viewer, parsed.data);
    if (!r.ok) return refused(r);
    await audit({
      actorType: "staff",
      actorId: id,
      action: "editorial.question.deleted",
      targetType: "daily_drop_question",
      targetId: r.id,
    });
  } catch (error) {
    return guard(error);
  }
  revalidate();
  redirect({ href: "/admin/editorial?deleted=1", locale: await getLocale() });
  return {};
}

const FRESH_MS = 15 * 60 * 1000; // as Better Auth's freshAge (src/lib/auth/auth.ts)

/** Admin only, for severe errors (J6): a recent sign-in, a stated reason and a confirmation. */
export async function withdrawQuestionAction(
  _prev: EditorialState,
  form: FormData,
): Promise<EditorialState> {
  const values = { reason: String(form.get("reason") ?? "") };
  const parsed = ref.safeParse({ id: form.get("id"), version: form.get("version") });
  if (!parsed.success) return { error: "generic", values };
  const reason = values.reason.replace(/\s+/g, " ").trim();
  if (reason.length < 10 || reason.length > 500) return { error: "reason", values };
  if (form.get("confirm") !== "on") return { error: "confirm", values };
  try {
    const { session, viewer, id } = await editor();
    if (viewer.role !== "admin") return { error: "forbidden", values };
    if (Date.now() - new Date(session.session.createdAt).getTime() > FRESH_MS)
      return { error: "freshSession", values };
    const r = await withdrawQuestion(viewer, parsed.data);
    if (!r.ok) return refused(r, values);
    await audit({
      actorType: "staff",
      actorId: id,
      action: "editorial.question.withdrawn",
      targetType: "daily_drop_question",
      targetId: r.id,
      metadata: { reason },
    });
    revalidate();
    return { ok: true };
  } catch (error) {
    return guard(error);
  }
}

/** ADM-09 "Publish now": the same idempotent run as the job, for today's UTC date (J6). */
export async function publishNowAction(
  _prev: EditorialState,
  form: FormData,
): Promise<EditorialState> {
  if (form.get("confirm") !== "on") return { error: "confirm" };
  try {
    const { viewer, id } = await editor();
    if (!mayEdit(viewer)) return { error: "forbidden" }; // e.g. a deactivated account with a live session
    if (await limited(id)) return { error: "tooMany" };
    const out = await runPublication(utcDate(), { trigger: "manual", actorId: id });
    revalidate();
    switch (out.status) {
      case "published":
        return {
          ok: true,
          outcome: out.skippedQuestionId ? "skipped" : out.usedReserve ? "reserve" : "published",
        };
      case "already":
      case "withdrawn": // not reached: Publish now may refill a withdrawn date
        return { ok: true, outcome: "already" };
      case "paused":
        return { error: "paused" };
      case "empty":
        return { error: "empty" };
    }
  } catch (error) {
    if (error instanceof PublicationError) {
      revalidate();
      return { error: "publishFailed" };
    }
    return guard(error);
  }
}
