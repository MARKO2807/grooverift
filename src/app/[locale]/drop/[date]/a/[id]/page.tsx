import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { AnswerCard, AnswerGone } from "@/components/drop/answer-card";
import { CommentForm, CommentList } from "@/components/drop/comments";
import { EmberDefs } from "@/components/drop/parts";
import { PublicDrop } from "@/components/drop/public-drop";
import { PublicShell } from "@/components/shell/public-shell";
import { FeaturePaused } from "@/components/system/states";
import { Link } from "@/i18n/navigation";
import { answerThread } from "@/lib/data/answers";
import { publishedOn } from "@/lib/data/drops";
import { loadOwner } from "@/lib/data/facts";
import { activeRestriction } from "@/lib/data/safety";
import { dropLocale, toCard, toComment } from "@/lib/drop/present";
import { env } from "@/lib/env";
import { flagState, isEnabled } from "@/lib/flags";
import { notAvailable, profileViewer } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; date: string; id: string }>;

/** The question only, as on the question page (D-022, U-08): the answer's author never shows up in a preview. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, date } = await params;
  const q = await publishedOn(date, dropLocale(locale));
  const ts = await getTranslations("system");
  if (!q) return { title: ts("naTitle") };
  return {
    title: q.text,
    openGraph: { title: q.text, description: "Daily Drop · GrooveRift", siteName: "GrooveRift" },
    twitter: { card: "summary", title: q.text },
  };
}

/**
 * `/drop/<date>/a/<id>` (HUB-03; J3 replies). Signed out: PUB-07 for the question, with no hint about the answer
 * (D-022, U-08). Signed in: the answer with its comments, if the viewer may see it; otherwise "nije dostupno"
 * (E13: an author who blocked the viewer), while the question page itself still opens. The answer must belong to
 * the date in the URL, so a link never mixes two questions.
 */
export default async function AnswerPage({ params }: { params: Params }) {
  const { locale, date, id } = await params;
  const lang = dropLocale(locale);
  const q = await publishedOn(date, lang);
  const { viewer, session } = await profileViewer(locale, `/drop/${date}/a/${id}`);
  if (!q) notAvailable();

  if (!session || !viewer.id)
    return (
      <PublicShell screen="share">
        <PublicDrop date={q.date} text={q.text} returnTo={`/drop/${date}/a/${id}`} />
      </PublicShell>
    );

  const thread = await answerThread(viewer, id);
  if (!thread || thread.questionId !== q.id) notAvailable();
  const t = await getTranslations("drop");
  const [dropPaused, commentsPaused, me, restriction, imagesOn] = await Promise.all([
    flagState("daily_drop").then((s) => s === "paused"),
    flagState("comments").then((s) => s === "paused"),
    loadOwner(viewer.id),
    activeRestriction(viewer.id),
    isEnabled("post_images", { role: viewer.role, userId: viewer.id }),
  ]);
  const a = thread.answer;
  const who = a.kind === "answer" ? a.author.displayName : null;
  const shareUrl = `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/drop/${date}/a/${id}`;

  return (
    <AppShell
      title={t("commentsTitle")}
      backHref={`/drop/${date}`}
      backHistory
      nav="hub"
      screen="answer"
    >
      <EmberDefs />
      <h2 className="sr-only">{who ? t("commentsOn", { name: who }) : t("commentsTitle")}</h2>
      <p className="ctx">
        {t("onQuestion")}{" "}
        <Link href={`/drop/${date}`} className="link">
          {q.text}
        </Link>
      </p>
      <div className="ans-solo">
        {a.kind === "answer" ? (
          <AnswerCard a={toCard(a)} date={date} solo headingLevel={2} shareUrl={shareUrl} />
        ) : (
          <AnswerGone
            id={a.id}
            date={date}
            comments={a.comments}
            removed={a.removed}
            link={false}
          />
        )}
      </div>
      <section className="drop-section" aria-labelledby="h-com">
        <h2 id="h-com" className="section-title">
          {t("commentsTitle")}
        </h2>
        <CommentList comments={thread.comments.map(toComment)} />
      </section>
      {dropPaused || commentsPaused ? (
        <FeaturePaused feature={dropPaused ? "daily_drop" : "comments"} />
      ) : a.kind === "answer" ? (
        <CommentForm
          answerId={a.id}
          imagesOn={imagesOn}
          privateProfile={me?.profile !== "public"}
          restriction={
            restriction
              ? { until: restriction.endsAt.toISOString(), noticeId: restriction.id }
              : null
          }
        />
      ) : (
        <p className="hint">{t("noNewComments")}</p>
      )}
    </AppShell>
  );
}
