import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { EditorialNav, QuestionLine } from "@/components/admin/editorial-parts";
import { Notice } from "@/components/ui/notice";
import { roleOf } from "@/lib/auth/session";
import { listPool } from "@/lib/data/editorial";
import { loadViewer } from "@/lib/data/facts";
import { RESERVE_LOW } from "@/lib/editorial/rules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.editorial.reserve");
  return { title: t("title") };
}

/** ADM-05 reserve: approved, timeless questions used in order (oldest first) when a date has none (J6, JO4). */
export default async function ReservePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/editorial/reserve", "editor", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.editorial.reserve");
  const f = await getFormatter();
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const pool = await listPool(viewer, "reserve");
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <EditorialNav current="reserve" />
      <p className="meta">{t("lead", { min: RESERVE_LOW })}</p>
      {pool.length < RESERVE_LOW ? (
        <Notice kind="warning">{t("low", { n: pool.length, min: RESERVE_LOW })}</Notice>
      ) : (
        <Notice kind="success">{t("enough", { n: pool.length })}</Notice>
      )}
      {pool.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("order")}</th>
                <th scope="col">{t("question")}</th>
                <th scope="col">{t("added")}</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((q, i) => (
                <tr key={q.id}>
                  <td>{i + 1}</td>
                  <td>
                    <Link href={`/admin/editorial/drops/${q.id}`}>
                      <QuestionLine q={q} locale={locale} />
                    </Link>
                  </td>
                  <td>{f.dateTime(q.createdAt, { dateStyle: "medium" })}</td>
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
