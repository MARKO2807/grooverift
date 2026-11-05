import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { EditorialNav, HealthNotices } from "@/components/admin/editorial-parts";
import { PublishNowForm } from "@/components/admin/editorial";
import { roleOf } from "@/lib/auth/session";
import { editorialHealth, listRuns } from "@/lib/data/editorial";
import { loadViewer } from "@/lib/data/facts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.editorial.jobs");
  return { title: t("title") };
}

// i18n-keys: admin.editorial.jobs.run.running admin.editorial.jobs.run.succeeded admin.editorial.jobs.run.failed admin.editorial.jobs.error.paused admin.editorial.jobs.error.no_question admin.editorial.jobs.error.other
const errorKey = (e: string | null) =>
  e === "paused" || e === "no_question" ? (`error.${e}` as const) : ("error.other" as const);

/** ADM-09: publication runs and failures, newest first, with "Publish now" for today's UTC date (J6). */
export default async function JobsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/editorial/jobs", "editor", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.editorial.jobs");
  const f = await getFormatter();
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const [health, runs] = await Promise.all([editorialHealth(), listRuns(viewer)]);
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <EditorialNav current="jobs" />
      <HealthNotices health={health} />
      <section className="ed-section" aria-labelledby="ed-now">
        <h3 id="ed-now" className="set-t">
          {t("nowTitle")}
        </h3>
        {health.todayPublished ? (
          <p className="meta">{t("todayDone", { date: health.today })}</p>
        ) : (
          <>
            <p className="meta">{t("nowLead", { date: health.today })}</p>
            <PublishNowForm today={health.today} />
          </>
        )}
      </section>
      <h3 className="set-t">{t("runsTitle")}</h3>
      {runs.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("date")}</th>
                <th scope="col">{t("attempt")}</th>
                <th scope="col">{t("result")}</th>
                <th scope="col">{t("started")}</th>
                <th scope="col">{t("question")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.publishDate} UTC</td>
                  <td>{r.attempt}</td>
                  <td>
                    {t(`run.${r.status}`)}
                    {r.status === "succeeded" && r.usedReserve ? ` · ${t("fromReserve")}` : ""}
                    {r.status === "failed" ? ` · ${t(errorKey(r.error))}` : ""}
                  </td>
                  <td>{f.dateTime(r.startedAt, { dateStyle: "short", timeStyle: "medium" })}</td>
                  <td>
                    {r.questionId ? (
                      <Link href={`/admin/editorial/drops/${r.questionId}`}>{t("open")}</Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="meta">{t("none")}</p>
      )}
    </section>
  );
}
