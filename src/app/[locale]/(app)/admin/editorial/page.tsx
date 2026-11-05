import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import {
  EditorialNav,
  HealthNotices,
  LanguagesCell,
  QuestionLine,
  statusLabel,
} from "@/components/admin/editorial-parts";
import { LocalTime } from "@/components/admin/editorial";
import { Notice } from "@/components/ui/notice";
import { editorialHealth, listCalendar, listPool } from "@/lib/data/editorial";
import { loadViewer } from "@/lib/data/facts";
import { roleOf } from "@/lib/auth/session";
import { addDays, CALENDAR_DAYS, CALENDAR_PAST_DAYS } from "@/lib/editorial/rules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.editorial.calendar");
  return { title: t("title") };
}

/** ADM-04: the editorial calendar by UTC date with the JO4 warnings, and the questions still in preparation. */
export default async function EditorialCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/editorial", "editor", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.editorial.calendar");
  const f = await getFormatter();
  const label = await statusLabel();
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const health = await editorialHealth();
  const from = addDays(health.today, -CALENDAR_PAST_DAYS);
  const to = addDays(health.today, CALENDAR_DAYS);
  const [{ questions, runs }, work] = await Promise.all([
    listCalendar(viewer, from, to),
    listPool(viewer, "work"),
  ]);
  const gaps = new Set(health.gaps);
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const deleted = (await searchParams).deleted === "1";

  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <EditorialNav current="calendar" />
      {deleted ? <Notice kind="success">{t("deleted")}</Notice> : null}
      <HealthNotices health={health} />
      <p className="meta">{t("lead")}</p>
      <LocalTime date={health.today} lead />
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("date")}</th>
              <th scope="col">{t("state")}</th>
              <th scope="col">{t("languages")}</th>
              <th scope="col">{t("question")}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((date) => {
              const owned = questions.filter((q) => q.publishDate === date);
              const reserveUsed = runs.some(
                (r) => r.publishDate === date && r.status === "succeeded" && r.usedReserve,
              );
              const isGap = gaps.has(date);
              const dateCell = (rows = 1) => (
                <th scope="row" rowSpan={rows > 1 ? rows : undefined}>
                  <span className="flex flex-col">
                    <span>
                      {f.dateTime(new Date(`${date}T00:00:00Z`), {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                      {date === health.today ? ` · ${t("today")}` : ""}
                    </span>
                    <span className="meta">{date} UTC</span>
                    {date > health.today ? (
                      <LocalTime date={date} unlessSameAs={health.today} />
                    ) : null}
                  </span>
                </th>
              );
              if (!owned.length) {
                return (
                  <tr key={date} className={isGap ? "ed-gap" : undefined}>
                    {dateCell()}
                    <td>{isGap ? t("emptySoon") : t("empty")}</td>
                    <td>—</td>
                    <td />
                  </tr>
                );
              }
              return owned.map((q, i) => (
                <tr key={q.id} className={date === health.today ? "ed-today" : undefined}>
                  {i === 0 ? dateCell(owned.length) : null}
                  <td>
                    {label(q)}
                    {q.status === "published" && reserveUsed ? ` · ${t("fromReserve")}` : ""}
                  </td>
                  <td>
                    <LanguagesCell q={q} />
                  </td>
                  <td>
                    <Link href={`/admin/editorial/drops/${q.id}`}>
                      <QuestionLine q={q} locale={locale} />
                    </Link>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <h2 className="set-t">{t("workTitle")}</h2>
      {work.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("question")}</th>
                <th scope="col">{t("state")}</th>
                <th scope="col">{t("languages")}</th>
                <th scope="col">{t("changed")}</th>
              </tr>
            </thead>
            <tbody>
              {work.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/admin/editorial/drops/${q.id}`}>
                      <QuestionLine q={q} locale={locale} />
                    </Link>
                  </td>
                  <td>{label(q)}</td>
                  <td>
                    <LanguagesCell q={q} />
                  </td>
                  <td>{f.dateTime(q.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="meta">{t("workNone")}</p>
      )}
    </section>
  );
}
