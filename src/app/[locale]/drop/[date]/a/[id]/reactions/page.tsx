import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { PersonRow } from "@/components/profile/person-row";
import { answerThread, whoReacted } from "@/lib/data/answers";
import { publishedOn } from "@/lib/data/drops";
import { peopleFor } from "@/lib/data/profiles";
import { dropLocale } from "@/lib/drop/present";
import { notAvailable, profileViewer } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; date: string; id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("drop");
  return { title: t("whoReacted") };
}

/**
 * POST-04: who reacted to an answer, newest first, for signed-in members who can see the answer. Blocked pairs and
 * hidden accounts are left out (J3, D-019); the list may therefore be shorter than the count another member sees.
 */
export default async function ReactionsPage({ params }: { params: Params }) {
  const { locale, date, id } = await params;
  const q = await publishedOn(date, dropLocale(locale));
  const { viewer, session } = await profileViewer(locale, `/drop/${date}/a/${id}/reactions`);
  if (!q || !session || !viewer.id) notAvailable();
  const thread = await answerThread(viewer, id);
  if (!thread || thread.questionId !== q.id || thread.answer.kind !== "answer") notAvailable();
  const ids = await whoReacted(viewer, id);
  if (!ids) notAvailable();
  const people = await peopleFor(viewer, ids);
  const t = await getTranslations("drop");
  return (
    <AppShell
      title={t("whoReacted")}
      backHref={`/drop/${date}/a/${id}`}
      backHistory
      nav="hub"
      screen="narrow"
    >
      <p className="ctx">{t("reactionsOn", { name: thread.answer.author.displayName })}</p>
      {people.length ? (
        <ul className="fl-list" aria-label={t("whoReacted")}>
          {people.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </ul>
      ) : (
        <div className="empty-b empty-quiet">
          <p className="empty-t">{t("noReactions")}</p>
        </div>
      )}
    </AppShell>
  );
}
