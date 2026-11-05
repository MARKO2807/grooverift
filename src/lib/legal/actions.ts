"use server";

import { headers } from "next/headers";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { validateNotice, type NoticeErrorKey } from "./notice";

export type NoticeFormState = {
  done?: boolean;
  error?: "generic";
  fieldErrors?: Record<string, NoticeErrorKey>;
  values?: Record<string, string>;
};

/**
 * PUB-11 submission. STEP 5.1 SCOPE: validates and writes an audit entry only (category, no personal data).
 * The `notice` table and the moderation queue arrive in steps 5.2 and 5.9; until then the form is not linked
 * to any member-facing invitation, and STATUS records that submissions are not stored. The rate limiter for
 * public forms arrives with the general limiter in 5.2.
 */
export async function submitNoticeAction(
  _prev: NoticeFormState,
  form: FormData,
): Promise<NoticeFormState> {
  const raw: Record<string, string> = {};
  for (const key of ["category", "url", "explanation", "name", "email", "goodFaith"]) {
    const v = form.get(key);
    if (typeof v === "string") raw[key] = v;
  }
  const result = validateNotice(raw);
  if (!result.ok) {
    const { goodFaith: _omit, ...values } = raw;
    return { fieldErrors: result.errors as Record<string, NoticeErrorKey>, values };
  }
  try {
    const session = await getSession();
    const h = await headers();
    await audit({
      actorType: session ? "member" : "system",
      actorId: session?.user.id ?? null,
      action: "legal.notice.received",
      targetType: "notice",
      metadata: { category: result.value.category, channel: "public_form", stored: false },
      userAgent: h.get("user-agent"),
    });
    return { done: true };
  } catch {
    return { error: "generic", values: raw };
  }
}
