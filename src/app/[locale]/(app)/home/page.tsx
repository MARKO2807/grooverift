import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { DdMeta, DdTop, FirstDrop, LateLine, PastList, Peeks } from "@/components/drop/parts";
import { FeaturePaused } from "@/components/system/states";
import { Notice } from "@/components/ui/notice";
import { memberPage } from "@/lib/auth/member-page";
import { roleOf } from "@/lib/auth/session";
import { peeks as firstPeeks, questionAnswers, type AnswerView } from "@/lib/data/answers";
import { archive, firstDropState, latestPublished } from "@/lib/data/drops";
import { loadViewer } from "@/lib/data/facts";
import { dropLocale } from "@/lib/drop/present";
import { utcDate } from "@/lib/editorial/rules";
import { flagState } from "@/lib/flags";

export const dynamic = "force-dynamic";

// i18n-keys: account.pending.restored

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title") };
}

/**
 * HOME-01 (α; D-064 e, D-068 c, J3): today's Daily Drop with one call to action, the first answers and "read N
 * more", then the past Drops. When today's question is late, the last one with the J3 E2 line; before the first
 * Drop, the countdown (D-078 (8)); while paused, the pause card with the question still readable (D-078 (7)).
 * "From people you follow" (the feed) arrives in B1 and is not shown as an empty promise.
 */
export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restored?: string }>;
}) {
  const { locale } = await params;
  // "Vrati račun" (SET-09) lands here; one quiet line says the account is back as it was.
  const restored =
    (await searchParams).restored === "1" ? (
      <Notice kind="success">{(await getTranslations("account.pending"))("restored")}</Notice>
    ) : null;
  const session = await memberPage(locale, "/home");
  const lang = dropLocale(locale);
  const t = await getTranslations("home");
  const td = await getTranslations("drop");
  const [viewer, drop, paused] = await Promise.all([
    loadViewer({ id: session.user.id, role: roleOf(session) }),
    latestPublished(lang),
    flagState("daily_drop").then((s) => s === "paused"),
  ]);

  if (!drop) {
    const first = await firstDropState();
    return (
      <AppShell title={t("title")} nav="home" home screen="home">
        {restored}
        {paused ? <FeaturePaused feature="daily_drop" /> : null}
        <FirstDrop nextDate={first.nextDate} />
      </AppShell>
    );
  }

  const late = drop.date !== utcDate();
  const [answers, past] = await Promise.all([
    questionAnswers(viewer, drop.id, "foryou"),
    archive(lang).then((all) => all.filter((q) => q.id !== drop.id).slice(0, 3)),
  ]);
  const shown = firstPeeks(answers.items, 2);
  const rest = answers.items.filter(
    (a): a is AnswerView => a.kind === "answer" && !shown.includes(a) && !a.muted,
  );
  const faces = [...(answers.mine ? [answers.mine] : []), ...shown, ...rest];

  return (
    <AppShell title={t("title")} nav="home" home screen="home">
      {restored}
      {paused ? <FeaturePaused feature="daily_drop" /> : null}
      <section className="dd dd-teaser dd-c dd-e" aria-labelledby="h-teaser">
        {late ? <LateLine /> : null}
        <DdTop date={drop.date} />
        <h2 id="h-teaser" className="dd-q">
          {drop.text}
        </h2>
        <DdMeta count={answers.count} faces={faces} mine={!!answers.mine} />
        {paused ? null : (
          <div className="dd-actions dd-actions-inline">
            {answers.mine ? (
              <Link href={`/drop/${drop.date}`} className="btn btn-secondary btn-cta">
                {td("seeAnswers")}
              </Link>
            ) : (
              <Link href={`/drop/${drop.date}?compose=1`} className="btn btn-primary btn-cta">
                {td("answer")}
              </Link>
            )}
          </div>
        )}
        <Peeks
          date={drop.date}
          peeks={shown}
          count={answers.count - (answers.mine ? 1 : 0)}
          rest={rest}
        />
      </section>
      <div className="home-side">
        {past.length ? (
          <section className="drop-section" aria-labelledby="h-past">
            <h2 id="h-past" className="section-title">
              {td("pastTitle")}
            </h2>
            <PastList items={past} />
            <Link href="/hub/archive" className="link section-link">
              {td("wholeArchive")}
            </Link>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
