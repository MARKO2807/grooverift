// DSA Art. 16 notices (PUB-11). Stored for the moderation queue of step 5.9. Personal data is limited to what
// Art. 16(2) asks for; the notifier's identity is staff-only and never shown to the reported member.
import { db } from "@/lib/db/client";
import { notice } from "@/lib/db/schema";
import type { NoticeInput } from "@/lib/legal/notice";

export async function storeNotice(input: NoticeInput, submittedBy: string | null): Promise<string> {
  const [row] = await db()
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
  return row!.id;
}
