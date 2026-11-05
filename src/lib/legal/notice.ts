import { z } from "zod";

// DSA Art. 16 notice (PUB-11). The fields follow Art. 16(2): (a) the reasons the content is illegal, (b) its
// exact location, (c) the notifier's name and email, except for offences under Articles 3 to 7 of Directive
// 2011/93/EU (child sexual abuse), and (d) a statement of good faith. Counsel confirms the scope (B.5).

export const NOTICE_CATEGORIES = [
  "csam",
  "hate",
  "threat",
  "privacy",
  "copyright",
  "fraud",
  "other",
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];
export const EXPLANATION_MAX = 5000;

// i18n-keys: notice.errors.categoryRequired notice.errors.urlRequired notice.errors.urlInvalid
// i18n-keys: notice.errors.explanationRequired notice.errors.explanationLong notice.errors.nameRequired
// i18n-keys: notice.errors.emailRequired notice.errors.emailInvalid notice.errors.goodFaithRequired
export type NoticeErrorKey =
  | "categoryRequired"
  | "urlRequired"
  | "urlInvalid"
  | "explanationRequired"
  | "explanationLong"
  | "nameRequired"
  | "emailRequired"
  | "emailInvalid"
  | "goodFaithRequired";

export type NoticeInput = {
  category: NoticeCategory;
  url: string;
  explanation: string;
  name: string | null;
  email: string | null;
};

export type NoticeValidation =
  | { ok: true; value: NoticeInput }
  | { ok: false; errors: Partial<Record<keyof NoticeInput | "goodFaith", NoticeErrorKey>> };

const email = z.email().max(254);

/** Validates a submitted notice. Pure (unit-tested); the server action calls it. */
export function validateNotice(raw: Record<string, string | undefined>): NoticeValidation {
  const errors: Partial<Record<keyof NoticeInput | "goodFaith", NoticeErrorKey>> = {};
  const category = NOTICE_CATEGORIES.find((c) => c === raw.category);
  if (!category) errors.category = "categoryRequired";

  const url = (raw.url ?? "").trim();
  if (!url) errors.url = "urlRequired";
  else {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") errors.url = "urlInvalid";
      if (url.length > 2000) errors.url = "urlInvalid";
    } catch {
      errors.url = "urlInvalid";
    }
  }

  const explanation = (raw.explanation ?? "").trim();
  if (!explanation) errors.explanation = "explanationRequired";
  else if (explanation.length > EXPLANATION_MAX) errors.explanation = "explanationLong";

  // Name and email are required except for child sexual abuse reports (Art. 16(2)(c)).
  const contactOptional = category === "csam";
  const name = (raw.name ?? "").trim().slice(0, 200);
  const mail = (raw.email ?? "").trim().toLowerCase();
  if (!name && !contactOptional) errors.name = "nameRequired";
  if (!mail && !contactOptional) errors.email = "emailRequired";
  else if (mail && !email.safeParse(mail).success) errors.email = "emailInvalid";

  if (raw.goodFaith !== "on") errors.goodFaith = "goodFaithRequired";

  if (Object.keys(errors).length || !category) return { ok: false, errors };
  return {
    ok: true,
    value: { category, url, explanation, name: name || null, email: mail || null },
  };
}
