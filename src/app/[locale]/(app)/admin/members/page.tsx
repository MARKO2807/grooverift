import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { isRole } from "@/lib/auth/roles";
import { adminPageGate } from "@/components/admin/gate";
import { RoleForm } from "@/components/admin/forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.members");
  return { title: t("title") };
}

export default async function AdminMembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/members", "editor", "moderator", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.members");
  const tr = await getTranslations("roles");
  const f = await getFormatter();
  const isAdmin = gate.role === "admin";
  const rows = await db()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(200);
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("name")}</th>
              <th scope="col">{t("email")}</th>
              <th scope="col">{t("role")}</th>
              <th scope="col">{t("twoFactor")}</th>
              <th scope="col">{t("status")}</th>
              <th scope="col">{t("created")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{isAdmin ? u.email : t("hidden")}</td>
                <td>
                  {isAdmin && u.id !== gate.session.user.id ? (
                    <RoleForm userId={u.id} role={u.role ?? "member"} name={u.name} />
                  ) : (
                    tr(isRole(u.role) ? u.role : "member")
                  )}
                </td>
                <td>{u.twoFactorEnabled ? t("yes") : t("no")}</td>
                <td>{u.banned ? t("banned") : t("active")}</td>
                <td>{f.dateTime(u.createdAt, { dateStyle: "medium" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
