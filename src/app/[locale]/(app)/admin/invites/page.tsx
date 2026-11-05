import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { adminPageGate } from "@/components/admin/gate";
import { InviteForm, RevokeInviteForm } from "@/components/admin/forms";
import { INVITE_TTL_DAYS, listInvitations } from "@/lib/data/invitations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.invites");
  return { title: t("title") };
}

// i18n-keys: admin.invites.status.sent admin.invites.status.accepted admin.invites.status.expired admin.invites.status.revoked
const statusKey = (s: "sent" | "accepted" | "expired" | "revoked") => `status.${s}` as const;

/** ADM-03 (phase 1): admins create, list and revoke invitations; the link goes out by email only. */
export default async function AdminInvitesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/invites", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.invites");
  const f = await getFormatter();
  const rows = await listInvitations();
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <p className="meta">{t("lead", { days: INVITE_TTL_DAYS })}</p>
      <InviteForm />
      {rows.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("email")}</th>
                <th scope="col">{t("statusHeading")}</th>
                <th scope="col">{t("language")}</th>
                <th scope="col">{t("invitedBy")}</th>
                <th scope="col">{t("created")}</th>
                <th scope="col">{t("expires")}</th>
                <th scope="col">
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{t(statusKey(r.status))}</td>
                  <td>{r.locale.toUpperCase()}</td>
                  <td>{r.invitedByName ?? "—"}</td>
                  <td>{f.dateTime(r.createdAt, { dateStyle: "medium" })}</td>
                  <td>
                    {r.status === "accepted" && r.acceptedAt
                      ? t("acceptedOn", { date: f.dateTime(r.acceptedAt, { dateStyle: "medium" }) })
                      : f.dateTime(r.expiresAt, { dateStyle: "medium" })}
                  </td>
                  <td>
                    {r.status === "sent" ? <RevokeInviteForm id={r.id} email={r.email} /> : null}
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
