import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/profile/avatar";
import { IconChevron, IconClock } from "@/components/ui/icons";
import type { AnswerView } from "@/lib/data/answers";
import type { PublishedQuestion } from "@/lib/data/drops";
import { goLiveAt } from "@/lib/editorial/rules";
import { longDate } from "@/lib/drop/present";
import { Countdown, LocalRelease } from "./countdown";

// Server pieces of the Daily Drop screens (HOME-01, HUB-01, HUB-02; pulse ddHead, dropTeaser, answerPeek,
// firstBlock, noDropBlock). The name is set as "Strujica" (D-064, ddn-c): the gradient name with a small charge
// running under it, which stops with "Smanji pokrete".

/** The Ember gradient for the pressed reaction wave (pulse index.html), once per page. */
export function EmberDefs() {
  return (
    <svg width="0" height="0" className="ember-defs" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gr-ember" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FF586B" />
          <stop offset="1" stopColor="#FFCB69" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DdName({ small = false, as: Tag = "p" }: { small?: boolean; as?: "p" | "span" }) {
  return <Tag className={`dd-name${small ? " dd-name-sm" : ""}`}>Daily Drop</Tag>;
}

export async function DdTop({ date }: { date: string }) {
  const locale = await getLocale();
  return (
    <div className="dd-top">
      <DdName />
      <p className="dd-date">
        <time dateTime={date}>{longDate(date, locale)}</time>
      </p>
    </div>
  );
}

/** "N odgovora, uključujući tvoj" with up to three faces, or "Još nitko nije odgovorio." */
export async function DdMeta({
  count,
  faces,
  mine,
}: {
  count: number;
  faces: AnswerView[];
  mine: boolean;
}) {
  const t = await getTranslations("drop");
  if (!count)
    return (
      <p className="dd-meta">
        <span>{t("noAnswersYet")}</span>
      </p>
    );
  return (
    <p className="dd-meta">
      {faces.length ? (
        <span className="stack" aria-hidden="true">
          {faces.slice(0, 3).map((a) => (
            <Avatar key={a.id} name={a.author.displayName} size="xs" />
          ))}
        </span>
      ) : null}
      <span>{mine ? t("answersWithYours", { count }) : t("answers", { count })}</span>
    </p>
  );
}

/** HOME-01 peeks (D-064 e, D-068 c): the first answers, then "Pročitaj još N odgovora" with faces. */
export async function Peeks({
  date,
  peeks,
  count,
  rest,
}: {
  date: string;
  peeks: AnswerView[];
  count: number;
  rest: AnswerView[];
}) {
  const t = await getTranslations("drop");
  if (!peeks.length) return null;
  const more = Math.max(0, count - peeks.length);
  return (
    <>
      <ul className="peeks" aria-label={t("firstAnswers")}>
        {peeks.map((a) => (
          <li key={a.id}>
            <Link href={`/drop/${date}/a/${a.id}`} className="peek">
              <Avatar name={a.author.displayName} size="xs" />
              <span className="peek-body">
                <span className="peek-who">{a.author.displayName}</span>
                <span className="peek-text" lang={a.language ?? undefined}>
                  {a.body}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more ? (
        <Link href={`/drop/${date}`} className="all-c">
          {rest.length ? (
            <span className="stack" aria-hidden="true">
              {rest.slice(0, 3).map((a) => (
                <Avatar key={a.id} name={a.author.displayName} size="xs" />
              ))}
            </span>
          ) : null}
          <span>{t("readMoreAnswers", { count: more })}</span>
          <IconChevron />
        </Link>
      ) : null}
    </>
  );
}

/** J3 E2 / D-070 (4): one line above the last Drop when today's question is late. */
export async function LateLine() {
  const t = await getTranslations("drop");
  return (
    <p className="dd-late" role="status">
      <IconClock />
      <span>{t.rich("late", { b: (c) => <b>{c}</b> })}</span>
    </p>
  );
}

/**
 * Before the first Daily Drop (D-078, pulse firstBlock b): the date and the local time of 00:00 UTC, the countdown
 * with seconds, and what the member can do meanwhile. Without a scheduled date, a calm line instead of a clock.
 */
export async function FirstDrop({
  nextDate,
  headingLevel = 2,
}: {
  nextDate: string | null;
  headingLevel?: 1 | 2;
}) {
  const t = await getTranslations("drop.first");
  const locale = await getLocale();
  const H = `h${headingLevel}` as const;
  const at = nextDate ? goLiveAt(nextDate).toISOString() : null;
  return (
    <>
      <section className="dd dd-teaser dd-c dd-e dd-first" aria-labelledby="h-first">
        <div className="dd-top">
          <DdName />
        </div>
        <H id="h-first" className="dd-q dd-q-first" tabIndex={headingLevel === 1 ? -1 : undefined}>
          {nextDate ? t("title", { date: longDate(nextDate, locale) }) : t("titleSoon")}
        </H>
        <p className="dd-meta first-time">
          <IconClock />
          {at ? <LocalRelease at={at} /> : <span>{t("releaseUtc")}</span>}
        </p>
        {at ? <Countdown target={at} /> : null}
      </section>
      <section className="drop-section" aria-labelledby="h-while">
        <h2 id="h-while" className="section-title">
          {t("meanwhile")}
        </h2>
        <ul className="set-list">
          <li>
            <Link href="/me/dna" className="set-row set-row-plain">
              <span className="set-txt">
                <span className="set-t">{t("dna")}</span>
              </span>
              <IconChevron />
            </Link>
          </li>
          <li>
            <Link href="/me" className="set-row set-row-plain">
              <span className="set-txt">
                <span className="set-t">{t("profile")}</span>
              </span>
              <IconChevron />
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}

/** A list of past questions (HOME-01 "Prethodni Daily Dropovi", HUB-04 rows). */
export async function PastList({ items }: { items: PublishedQuestion[] }) {
  const locale = await getLocale();
  return (
    <ul className="past">
      {items.map((q) => (
        <li key={q.id}>
          <Link href={`/drop/${q.date}`} className="past-item">
            <span className="past-date">
              <time dateTime={q.date}>{longDate(q.date, locale, false)}</time>
            </span>
            <span className="past-q">{q.text}</span>
            <IconChevron className="past-ic" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
