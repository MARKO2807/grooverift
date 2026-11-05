import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { AnswerCard, AnswerGone } from "@/components/drop/answer-card";
import { AnswerDock } from "@/components/drop/composer";
import { NewAnswers } from "@/components/drop/new-answers";
import { DdMeta, DdTop, EmberDefs } from "@/components/drop/parts";
import { PublicDrop } from "@/components/drop/public-drop";
import { ShareButton } from "@/components/drop/share-button";
import { SortControl } from "@/components/drop/sort-control";
import { PublicShell } from "@/components/shell/public-shell";
import { FeaturePaused } from "@/components/system/states";
import { IconChat } from "@/components/ui/icons";
import { questionAnswers } from "@/lib/data/answers";
import { publishedOn } from "@/lib/data/drops";
import { loadOwner } from "@/lib/data/facts";
import { dropLocale, toCard } from "@/lib/drop/present";
import { asSort, PAGE_SIZE } from "@/lib/drop/rules";
import { env } from "@/lib/env";
import { flagState } from "@/lib/flags";
import { notAvailable, profileViewer } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; date: string }>;
type Search = Promise<{ sort?: string; n?: string; compose?: string }>;

/**
 * Open Graph carries the question only (D-022, U-08): no answers, no names, no counts. Unpublished, future and
 * unknown dates get the "not available" title, like the page.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, date } = await params;
  const q = await publishedOn(date, dropLocale(locale));
  const ts = await getTranslations("system");
  if (!q) return { title: ts("naTitle") };
  const url = `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/drop/${date}`;
  return {
    title: q.text,
    description: `Daily Drop · ${date}`,
    openGraph: {
      title: q.text,
      description: "Daily Drop · GrooveRift",
      url,
      siteName: "GrooveRift",
      type: "article",
    },
    twitter: { card: "summary", title: q.text },
  };
}

/**
 * `/drop/<date>` (HUB-02 signed in, PUB-07 signed out; J3). Only a published question with a date up to today
 * opens; every other date answers "nije dostupno" with 404 (U-03). Members see their own answer pinned (D-035),
 * the three sorts, every visible answer (D-021) with placeholders where replies remain (E5, E6), and the dock.
 * Signed-out visitors see the question and the invitation-only explanation, nothing else (D-022).
 */
export default async function DropPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, date } = await params;
  const sp = await searchParams;
  const lang = dropLocale(locale);
  const q = await publishedOn(date, lang);
  const { viewer, session } = await profileViewer(locale, `/drop/${date}`);
  if (!q) notAvailable();
  const shareUrl = `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/drop/${date}`;

  if (!session || !viewer.id)
    return (
      <PublicShell screen="share">
        <PublicDrop date={q.date} text={q.text} returnTo={`/drop/${date}`} />
      </PublicShell>
    );

  const t = await getTranslations("drop");
  const sort = asSort(sp.sort);
  const n = Math.max(PAGE_SIZE, Math.min(1000, Number(sp.n) || PAGE_SIZE));
  const [answers, paused, me] = await Promise.all([
    questionAnswers(viewer, q.id, sort),
    flagState("daily_drop").then((s) => s === "paused"),
    loadOwner(viewer.id),
  ]);
  const shown = answers.items.slice(0, n);
  const faces = [
    ...(answers.mine ? [answers.mine] : []),
    ...answers.items.filter((a) => a.kind === "answer"),
  ];
  const more = answers.items.length - shown.length;
  const moreHref = `/drop/${date}?${new URLSearchParams({
    ...(sort !== "foryou" ? { sort } : {}),
    n: String(n + PAGE_SIZE),
  })}`;

  return (
    <AppShell
      title={t("pageTitle")}
      backHref="/hub"
      backHistory
      nav="hub"
      bodyHeading
      screen="drop"
      actions={<ShareButton url={shareUrl} title={q.text} />}
      dock={
        <AnswerDock
          questionId={q.id}
          mine={answers.mine ? { id: answers.mine.id, body: answers.mine.body } : null}
          privateProfile={me?.profile !== "public"}
          paused={paused}
          autoOpen={sp.compose === "1"}
        />
      }
    >
      <EmberDefs />
      <header className="dd dd-page">
        <DdTop date={q.date} />
        <h1 className="dd-q" tabIndex={-1}>
          {q.text}
        </h1>
        <DdMeta count={answers.count} faces={faces} mine={!!answers.mine} />
      </header>
      {paused ? <FeaturePaused feature="daily_drop" homeLink /> : null}
      {answers.mine ? (
        <div className="mine-wrap">
          <AnswerCard
            a={toCard(answers.mine)}
            date={q.date}
            shareUrl={`${shareUrl}/a/${answers.mine.id}`}
          />
        </div>
      ) : null}
      <div className="list-head">
        <h2 className="section-title" id="h-answers">
          {t("answersTitle")}
          {answers.items.length ? (
            <span className="count">{answers.count - (answers.mine ? 1 : 0)}</span>
          ) : null}
        </h2>
      </div>
      {answers.items.length ? (
        <>
          <SortControl value={sort} />
          <NewAnswers questionId={q.id} date={q.date} count={answers.count} />
          <ul className="ans-list" aria-labelledby="h-answers">
            {shown.map((a) => (
              <li key={a.id}>
                {a.kind === "answer" ? (
                  <AnswerCard a={toCard(a)} date={q.date} shareUrl={`${shareUrl}/a/${a.id}`} />
                ) : (
                  <AnswerGone id={a.id} date={q.date} comments={a.comments} removed={a.removed} />
                )}
              </li>
            ))}
          </ul>
          {more > 0 ? (
            <Link href={moreHref} className="btn btn-secondary btn-block" scroll={false}>
              {t("showMore", { count: Math.min(more, PAGE_SIZE) })}
            </Link>
          ) : null}
        </>
      ) : (
        <>
          <NewAnswers questionId={q.id} date={q.date} count={answers.count} />
          <div className="empty-b empty-quiet">
            <IconChat />
            <p className="empty-t">{answers.mine ? t("onlyYours") : t("noAnswers")}</p>
            <p>{answers.mine ? t("onlyYoursText") : t("noAnswersText")}</p>
          </div>
        </>
      )}
    </AppShell>
  );
}
