"use server";

import { headers } from "next/headers";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { logDbError } from "@/lib/data/db-errors";
import { hidePhotoOnNotice } from "@/lib/data/artist-photos";
import { storeNotice } from "@/lib/data/notices";
import { consume } from "@/lib/data/rate-limit";
import { clientIp } from "@/lib/http/client-ip";
import {
  EXPLANATION_MAX,
  HIDES_AT_ONCE,
  isPhotoReason,
  validateNotice,
  type NoticeErrorKey,
} from "./notice";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  for (const key of [
    "category",
    "url",
    "explanation",
    "name",
    "email",
    "goodFaith",
    "photoArtist",
    "photoReason",
  ]) {
    const v = form.get(key);
    if (typeof v === "string") raw[key] = v;
  }
  const { goodFaith: _omit, ...values } = raw;
  const result = validateNotice(raw);
  // Step 5.11: a notice about an artist photo also names what is wrong with it.
  const photoArtist = raw.photoArtist && UUID.test(raw.photoArtist) ? raw.photoArtist : null;
  const photoReason = photoArtist && isPhotoReason(raw.photoReason) ? raw.photoReason : null;
  if (!result.ok || (photoArtist && !photoReason)) {
    const errors = (result.ok ? {} : result.errors) as Record<string, NoticeErrorKey>;
    if (photoArtist && !photoReason) errors.photoReason = "photoReasonRequired";
    return { fieldErrors: errors, values };
  }
  if (photoReason) {
    const tag = `[artist photo: ${photoReason}] `;
    result.value.explanation = `${tag}${result.value.explanation}`.slice(0, EXPLANATION_MAX);
  }
  try {
    const h = await headers();
    const rate = await consume("notice", clientIp(h));
    if (!rate.allowed) return { error: "tooMany", values };
    const session = await getSession();
    const id = await storeNotice(result.value, session?.user.id ?? null);
    if (photoArtist && photoReason && HIDES_AT_ONCE.includes(photoReason))
      await hidePhotoOnNotice(photoArtist, id);
    await audit({
      actorType: session ? "member" : "system",
      actorId: session?.user.id ?? null,
      action: "legal.notice.received",
      targetType: "notice",
      targetId: id,
      metadata: {
        category: result.value.category,
        channel: "public_form",
        ...(photoReason ? { photoReason } : {}),
      },
      userAgent: h.get("user-agent"),
    });
    return { done: true };
  } catch (e) {
    logDbError("submitNoticeAction", e); // never the message: it carries the notifier's text (review M1)
    return { error: "generic", values };
  }
}
