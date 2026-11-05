import { desc } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/ui/notice";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { getSession, roleOf } from "@/lib/auth/session";

/** Audit log, admin only (visibility matrix: "Audit log: Admin read-only"). */
export default async function AdminAuditPage() {
  const t = await getTranslations("admin.audit");
  const tf = await getTranslations("admin.forbidden");
  const f = await getFormatter();
  const session = await getSession();
  if (roleOf(session) !== "admin") {
    return (
      <AppShell title={tf("title")} backHref="/admin">
        <Notice kind="warning">{tf("role")}</Notice>
      </AppShell>
    );
  }
  const rows = await db().select().from(auditLog).orderBy(desc(auditLog.at)).limit(100);
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <p className="lead">{t("lead")}</p>
      {rows.length === 0 ? (
        <p className="meta">{t("empty")}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("at")}</th>
                <th scope="col">{t("actor")}</th>
                <th scope="col">{t("action")}</th>
                <th scope="col">{t("target")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{f.dateTime(r.at, { dateStyle: "short", timeStyle: "medium" })}</td>
                  <td>
                    {r.actorType}
                    {r.actorId ? ` ${r.actorId.slice(0, 8)}…` : ""}
                  </td>
                  <td>
                    <code>{r.action}</code>
                  </td>
                  <td>{r.targetType ? `${r.targetType} ${r.targetId?.slice(0, 8) ?? ""}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
