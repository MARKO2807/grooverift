import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { IconCalendar, IconChevron } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { archive } from "@/lib/data/drops";
import { dropLocale } from "@/lib/drop/present";
import { isIsoDate } from "@/lib/editorial/rules";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("drop");
  return { title: t("archiveTitle") };
}

/**
 * HUB-04 (D-036, D-093 (4), pulse hub b): every published question by month, newest first, each opening its
 * question page, fully interactive. "Jump to date" is a plain GET form: a published date opens its question, any
 * other date says so here (unpublished dates never appear, U-03). The archive starts with the first question.
 */
export default async function ArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale } = await params;
  const { date } = await searchParams;
  await memberPage(locale, "/hub/archive");
  const t = await getTranslations("drop");
  const all = await archive(dropLocale(locale));
  const intl = locale === "en" ? "en-GB" : "hr-HR";

  let missing = false;
  if (date !== undefined) {
    if (isIsoDate(date) && all.some((q) => q.date === date))
      redirect({ href: `/drop/${date}`, locale });
    missing = true;
  }

  const months: { key: string; label: string; items: typeof all }[] = [];
  for (const q of all) {
    const key = q.date.slice(0, 7);
    let m = months.find((x) => x.key === key);
    if (!m) {
      const label = new Intl.DateTimeFormat(intl, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${q.date}T00:00:00Z`));
      months.push((m = { key, label: label[0]!.toUpperCase() + label.slice(1), items: [] }));
    }
    m.items.push(q);
  }

  return (
    <AppShell title={t("archiveTitle")} backHref="/hub" backHistory nav="hub" screen="narrow">
      {all.length ? (
        <>
          <form className="jump" method="get">
            <label className="label" htmlFor="jump-date">
              {t("jumpLabel")}
            </label>
            <div className="jump-row">
              <input
                id="jump-date"
                name="date"
                type="date"
                className="input"
                min={all[all.length - 1]!.date}
                max={all[0]!.date}
                defaultValue={date && isIsoDate(date) ? date : undefined}
                aria-describedby={missing ? "jump-err" : undefined}
                aria-invalid={missing || undefined}
              />
              <button type="submit" className="btn btn-secondary">
                {t("jumpGo")}
              </button>
            </div>
            {missing ? (
              <p className="field-err" id="jump-err" role="alert">
                {t("jumpMissing")}
              </p>
            ) : null}
          </form>
          {months.map((m) => (
            <section key={m.key} className="drop-section" aria-labelledby={`m-${m.key}`}>
              <h2 id={`m-${m.key}`} className="month-title">
                {m.label}
              </h2>
              <ul className="past past-compact">
                {m.items.map((q) => (
                  <li key={q.id}>
                    <Link href={`/drop/${q.date}`} className="past-item">
                      <span className="past-day" aria-hidden="true">
                        {Number(q.date.slice(8))}.
                      </span>
                      <span className="past-q">
                        {q.text}
                        <span className="sr-only">
                          ,{" "}
                          {new Intl.DateTimeFormat(intl, {
                            day: "numeric",
                            month: "long",
                            timeZone: "UTC",
                          }).format(new Date(`${q.date}T00:00:00Z`))}
                        </span>
                      </span>
                      <IconChevron className="past-ic" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="set-note">{t("archiveNote")}</p>
        </>
      ) : (
        <div className="empty-b">
          <IconCalendar />
          <p className="empty-t">{t("archiveEmpty")}</p>
          <p>{t("first.archiveStarts")}</p>
        </div>
      )}
    </AppShell>
  );
}
