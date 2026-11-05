import { count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { auditLog, featureFlag, user } from "@/lib/db/schema";
import { adminPageGate } from "@/components/admin/gate";
import { HealthNotices } from "@/components/admin/editorial-parts";
import { Link } from "@/i18n/navigation";
import { editorialHealth } from "@/lib/data/editorial";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin", "editor", "moderator", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.overview");
  const tr = await getTranslations("roles");
  const d = db();
  const [[members], [flags], [entries]] = await Promise.all([
    d.select({ n: count() }).from(user),
    d.select({ n: count() }).from(featureFlag),
    d.select({ n: count() }).from(auditLog),
  ]);
  // ADM-01 alerts (J6, JO4): editors and admins see the Daily Drop warnings here as well as by email.
  const editorial =
    gate.role === "editor" || gate.role === "admin" ? await editorialHealth() : null;
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <p className="meta">{t("role", { role: tr(gate.role) })}</p>
      {editorial ? (
        <section className="form-stack" aria-labelledby="adm-drop">
          <h3 id="adm-drop" className="set-t">
            {t("dropTitle")}
          </h3>
          <HealthNotices health={editorial} />
          <Link
            href="/admin/editorial"
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: "flex-start" }}
          >
            {t("toEditorial")}
          </Link>
        </section>
      ) : null}
      <ul className="set-list">
        <li className="set-row">
          <span className="set-txt">
            <span className="set-t">{t("members")}</span>
          </span>
          <b>{members?.n ?? 0}</b>
        </li>
        <li className="set-row">
          <span className="set-txt">
            <span className="set-t">{t("flags")}</span>
          </span>
          <b>{flags?.n ?? 0}</b>
        </li>
        <li className="set-row">
          <span className="set-txt">
            <span className="set-t">{t("audit")}</span>
          </span>
          <b>{entries?.n ?? 0}</b>
        </li>
      </ul>
    </section>
  );
}
