"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { sendMail } from "@/lib/auth/email";
import { isRole } from "@/lib/auth/roles";
import { Forbidden, requireRole, Unauthenticated } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { createInvitation, revokeInvitation } from "@/lib/data/invitations";
import { consume } from "@/lib/data/rate-limit";
import { env } from "@/lib/env";
import { setFlag } from "@/lib/flags";
import { inviteLink, inviteMail } from "@/lib/onboarding/invite-mail";
import type { FormState } from "@/lib/auth/actions";

// Admin actions (step 4.9, invitations in 5.4). The role is checked here, server-side, on every call; the UI only hides.

// i18n-keys: authErrors.inviteMember authErrors.inviteOpen authErrors.mailFailed
function guard(error: unknown): FormState {
  if (error instanceof Unauthenticated) return { error: "freshSession" };
  if (error instanceof Forbidden) return { error: "generic" };
  console.error("[admin action]", error instanceof Error ? error.message : error);
  return { error: "generic" };
}

/** ADM-03: one invitation per address, emailed as a link; 50 per admin per day (LIMITS.invite). */
export async function createInviteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: String(form.get("email") ?? "") };
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email().max(254),
      locale: z.enum(["hr", "en"]),
    })
    .safeParse({ email: form.get("email"), locale: form.get("locale") ?? "hr" });
  if (!parsed.success) return { fieldErrors: { email: "emailInvalid" }, values };
  try {
    const session = await requireRole("admin");
    const rate = await consume("invite", session.user.id);
    if (!rate.allowed) return { error: "tooMany", retryAfter: rate.retryAfterSeconds, values };
    const created = await createInvitation({
      email: parsed.data.email,
      invitedBy: session.user.id,
      locale: parsed.data.locale,
    });
    if (!created.ok) {
      if (created.reason === "invalid") return { fieldErrors: { email: "emailInvalid" }, values };
      return {
        fieldErrors: { email: created.reason === "member" ? "inviteMember" : "inviteOpen" },
        values,
      };
    }
    try {
      await sendMail(
        inviteMail(
          created.email,
          parsed.data.locale,
          inviteLink(env().APP_URL, parsed.data.locale, created.token),
        ),
      );
    } catch (error) {
      // The link exists only in that mail: without it the invite is useless, so it is withdrawn at once.
      await revokeInvitation(created.id);
      console.error("[invite mail]", error instanceof Error ? error.message : error);
      await audit({ actorType: "system", action: "mail.failed", metadata: { kind: "invite" } });
      return { error: "mailFailed", values };
    }
    await audit({
      actorType: "staff",
      actorId: session.user.id,
      action: "invite.created",
      targetType: "invitation",
      targetId: created.id,
      metadata: { locale: parsed.data.locale },
    });
    revalidatePath("/[locale]/admin/invites", "page");
    return { ok: true, values: { email: "" } };
  } catch (error) {
    return guard(error);
  }
}

export async function revokeInviteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.uuid().safeParse(form.get("id"));
  if (!parsed.success) return { error: "generic" };
  try {
    const session = await requireRole("admin");
    const revoked = await revokeInvitation(parsed.data);
    if (revoked) {
      await audit({
        actorType: "staff",
        actorId: session.user.id,
        action: "invite.revoked",
        targetType: "invitation",
        targetId: parsed.data,
      });
    }
    revalidatePath("/[locale]/admin/invites", "page");
    return { ok: true };
  } catch (error) {
    return guard(error);
  }
}

export async function setRoleAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ userId: z.uuid(), role: z.string().refine(isRole) })
    .safeParse({ userId: form.get("userId"), role: form.get("role") });
  if (!parsed.success) return { error: "generic" };
  try {
    const session = await requireRole("admin");
    if (parsed.data.userId === session.user.id) return { error: "cannotSelf" };
    await auth.api.setRole({
      body: { userId: parsed.data.userId, role: parsed.data.role as "member" },
      headers: await headers(),
    });
    await audit({
      actorType: "staff",
      actorId: session.user.id,
      action: "admin.role.set",
      targetType: "user",
      targetId: parsed.data.userId,
      metadata: { role: parsed.data.role },
    });
    return { ok: true };
  } catch (error) {
    return guard(error);
  }
}

export async function setFlagAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      key: z.string().regex(/^[a-z0-9_]{2,40}$/),
      state: z.enum(["on", "off", "paused"]),
      note: z.string().max(200).optional(),
    })
    .safeParse({
      key: form.get("key"),
      state: form.get("state"),
      note: form.get("note") ?? undefined,
    });
  if (!parsed.success) return { error: "generic" };
  try {
    const session = await requireRole("admin");
    await setFlag(
      parsed.data.key,
      { state: parsed.data.state, note: parsed.data.note ?? null },
      session.user.id,
    );
    return { ok: true };
  } catch (error) {
    return guard(error);
  }
}
