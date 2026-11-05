import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { DdMeta, DdTop, FirstDrop, LateLine } from "@/components/drop/parts";
import { FeaturePaused } from "@/components/system/states";
import { memberPage } from "@/lib/auth/member-page";
import { roleOf } from "@/lib/auth/session";
import { questionAnswers } from "@/lib/data/answers";
import { firstDropState, recentPublished } from "@/lib/data/drops";
import { loadViewer } from "@/lib/data/facts";
import { dropLocale } from "@/lib/drop/present";
import { utcDate } from "@/lib/editorial/rules";
import { flagState } from "@/lib/flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("hub") };
}

/**
 * HUB-01 (D-064 e without the B2 programme; D-093 (4)): the last seven days as a strip of published days, the
 * chosen day's question with its call to action, and the whole archive. Days without a published question are
 * not shown (U-03). `?day=` keeps the chosen day in the URL, so back and reload return to it. The Weekly Poll,
 * Did You Know? and question suggestions (HUB-09) arrive in B2 and are not shown as empty promises.
 */
export default async function HubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { locale } = await params;
  const { day } = await searchParams;
  const session = await memberPage(locale, "/hub");
  const lang = dropLocale(locale);
  const t = await getTranslations("nav");
  const td = await getTranslations("drop");
  const intl = (await getLocale()) === "en" ? "en-GB" : "hr-HR";
  const [viewer, days, paused] = await Promise.all([
    loadViewer({ id: session.user.id, role: roleOf(session) }),
    recentPublished(lang, 7),
    flagState("daily_drop").then((s) => s === "paused"),
  ]);
  const today = utcDate();

  if (!days.length) {
    const first = await firstDropState();
    return (
      <AppShell title={t("hub")} nav="hub" screen="hub">
        {paused ? <FeaturePaused feature="daily_drop" homeLink /> : null}
        {first.started ? null : <FirstDrop nextDate={first.nextDate} />}
        {first.started ? (
          <p className="hint">{td("noRecent")}</p>
        ) : (
          <p className="hint hub-first-hint">{td("first.archiveStarts")}</p>
        )}
        {first.started ? (
          <Link href="/hub/archive" className="link section-link">
            {td("wholeArchive")}
          </Link>
        ) : null}
      </AppShell>
    );
  }

  const sel = days.find((d) => d.date === day) ?? days[days.length - 1]!;
  const answers = await questionAnswers(viewer, sel.id, "foryou");
  const faces = [
    ...(answers.mine ? [answers.mine] : []),
    ...answers.items.filter((a) => a.kind === "answer"),
  ];
  const wd = (date: string) =>
    new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: "UTC" }).format(
      new Date(`${date}T00:00:00Z`),
    );
  // The rest of the date for screen readers, after the visible weekday and day (WCAG 2.5.3: the visible text
  // starts the accessible name): "5. studenoga, četvrtak".
  const rest = (date: string) => {
    const at = new Date(`${date}T00:00:00Z`);
    const month = new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", timeZone: "UTC" })
      .formatToParts(at)
      .filter((p) => p.type !== "day")
      .map((p) => p.value)
      .join("")
      .trim();
    const weekday = new Intl.DateTimeFormat(intl, { weekday: "long", timeZone: "UTC" }).format(at);
    return `${month}, ${weekday}`;
  };
  const lateToday = !days.some((d) => d.date === today);

  return (
    <AppShell title={t("hub")} nav="hub" screen="hub">
      {paused ? <FeaturePaused feature="daily_drop" homeLink /> : null}
      <nav className="day-strip" aria-label={td("lastDays")}>
        {days.map((d) => {
          const isToday = d.date === today;
          return (
            <Link
              key={d.date}
              href={`/hub?day=${d.date}`}
              className="day"
              scroll={false}
              aria-current={d === sel ? "true" : undefined}
            >
              <span className="day-wd">{isToday ? td("today") : wd(d.date)}</span>
              <span className="sr-only"> </span>
              <span className="day-n">{Number(d.date.slice(8))}</span>
              <span className="sr-only">{` ${rest(d.date)}`}</span>
            </Link>
          );
        })}
      </nav>
      <section className="dd dd-teaser dd-c dd-e" aria-labelledby="h-teaser">
        {lateToday && sel === days[days.length - 1] ? <LateLine /> : null}
        <DdTop date={sel.date} />
        <h2 id="h-teaser" className="dd-q">
          {sel.text}
        </h2>
        <DdMeta count={answers.count} faces={faces} mine={!!answers.mine} />
        {sel.date !== today && !answers.mine ? <p className="dd-still">{td("stillOpen")}</p> : null}
        {paused ? null : (
          <div className="dd-actions dd-actions-inline">
            {answers.mine ? (
              <Link href={`/drop/${sel.date}`} className="btn btn-secondary btn-cta">
                {td("seeAnswers")}
              </Link>
            ) : (
              <>
                <Link href={`/drop/${sel.date}?compose=1`} className="btn btn-primary btn-cta">
                  {td("answer")}
                </Link>
                <Link href={`/drop/${sel.date}`} className="link read-link">
                  {td("readFirst")}
                </Link>
              </>
            )}
          </div>
        )}
      </section>
      <Link href="/hub/archive" className="link section-link">
        {td("wholeArchive")}
      </Link>
    </AppShell>
  );
}
