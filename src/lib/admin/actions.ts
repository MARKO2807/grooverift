"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { isRole } from "@/lib/auth/roles";
import { Forbidden, requireRole, Unauthenticated } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { setFlag } from "@/lib/flags";
import type { FormState } from "@/lib/auth/actions";

// Admin actions (step 4.9). The role is checked here, server-side, on every call; the UI only hides.

function guard(error: unknown): FormState {
  if (error instanceof Unauthenticated) return { error: "freshSession" };
  if (error instanceof Forbidden) return { error: "generic" };
  console.error("[admin action]", error);
  return { error: "generic" };
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
