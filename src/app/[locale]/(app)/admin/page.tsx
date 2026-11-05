import { count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { auditLog, featureFlag, user } from "@/lib/db/schema";
import { getSession, roleOf } from "@/lib/auth/session";

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin.overview");
  const tr = await getTranslations("roles");
  const session = await getSession();
  const d = db();
  const [[members], [flags], [entries]] = await Promise.all([
    d.select({ n: count() }).from(user),
    d.select({ n: count() }).from(featureFlag),
    d.select({ n: count() }).from(auditLog),
  ]);
  return (
    <section className="form-stack" aria-label={t("role", { role: tr(roleOf(session)) })}>
      <p className="meta">{t("role", { role: tr(roleOf(session)) })}</p>
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
