"use server";

import { headers } from "next/headers";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { logDbError } from "@/lib/data/db-errors";
import { storeNotice } from "@/lib/data/notices";
import { consume } from "@/lib/data/rate-limit";
import { clientIp } from "@/lib/http/client-ip";
import { validateNotice, type NoticeErrorKey } from "./notice";

export type NoticeFormState = {
  done?: boolean;
  error?: "generic" | "tooMany";
  fieldErrors?: Record<string, NoticeErrorKey>;
  values?: Record<string, string>;
};

/**
 * PUB-11 submission: validate, rate-limit per client IP (5 per hour), store in `notice` for the moderation queue
 * (step 5.9) and audit the category only (no personal data in the audit log).
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
  const { goodFaith: _omit, ...values } = raw;
  const result = validateNotice(raw);
  if (!result.ok) {
    return { fieldErrors: result.errors as Record<string, NoticeErrorKey>, values };
  }
  try {
    const h = await headers();
    const rate = await consume("notice", clientIp(h));
    if (!rate.allowed) return { error: "tooMany", values };
    const session = await getSession();
    const id = await storeNotice(result.value, session?.user.id ?? null);
    await audit({
      actorType: session ? "member" : "system",
      actorId: session?.user.id ?? null,
      action: "legal.notice.received",
      targetType: "notice",
      targetId: id,
      metadata: { category: result.value.category, channel: "public_form" },
      userAgent: h.get("user-agent"),
    });
    return { done: true };
  } catch (e) {
    logDbError("submitNoticeAction", e); // never the message: it carries the notifier's text (review M1)
    return { error: "generic", values };
  }
}
