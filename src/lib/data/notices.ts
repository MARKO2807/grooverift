// DSA Art. 16 notices (PUB-11). Personal data is limited to what Art. 16(2) asks for; the notifier's identity is
// staff-only and never shown to the reported member. Step 5.9: every notice lands in the moderation queue. When its
// URL points at one of our answers, comments or profiles, it joins (or opens) the case for that object, so a member
// report and a notice about the same thing are one case; otherwise it is a case of its own, reviewed by hand.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { moderationCase, notice, profile } from "@/lib/db/schema";
import { env } from "@/lib/env";
import type { NoticeInput } from "@/lib/legal/notice";
import { noticePriority, parseContentUrl, type ContentRef } from "@/lib/moderation/rules";
import { caseLock, openCaseFor, resolveTarget, type Resolved } from "./safety";

/** Hosts that count as ours for a notice URL: the app's own address (APP_URL). */
export function ownHosts(): string[] {
  try {
    return [new URL(env().APP_URL).host.toLowerCase()];
  } catch {
    return [];
  }
}

async function resolveRef(ref: ContentRef | null): Promise<Resolved | null> {
  if (!ref) return null;
  if (ref.type === "profile") {
    const [p] = await db()
      .select({ id: profile.userId })
      .from(profile)
      .where(eq(profile.username, ref.username));
    return p ? resolveTarget(null, "profile", p.id) : null;
  }
  return resolveTarget(null, ref.type, ref.id);
}

export async function storeNotice(input: NoticeInput, submittedBy: string | null): Promise<string> {
  const target = await resolveRef(parseContentUrl(input.url, ownHosts()));
  const priority = noticePriority(input.category);
  return db().transaction(async (tx) => {
    const [row] = await tx
      .insert(notice)
      .values({
        category: input.category,
        url: input.url,
        explanation: input.explanation,
        notifierName: input.name,
        notifierEmail: input.email,
        submittedBy,
      })
      .returning({ id: notice.id });
    const id = row!.id;
    let caseId: string;
    if (target) {
      await caseLock(tx, target.objectType, target.objectId);
      caseId = await openCaseFor(tx, target, priority);
    } else {
      const [c] = await tx
        .insert(moderationCase)
        .values({ targetType: "notice", targetId: id, priority })
        .returning({ id: moderationCase.id });
      caseId = c!.id;
    }
    await tx.update(notice).set({ caseId }).where(eq(notice.id, id));
    return id;
  });
}
