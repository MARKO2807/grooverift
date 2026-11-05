import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { listFlags } from "@/lib/flags";
import { adminPageGate } from "@/components/admin/gate";
import { FlagForm } from "@/components/admin/forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.flags");
  return { title: t("title") };
}

export default async function AdminFlagsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/flags", "editor", "moderator", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.flags");
  const f = await getFormatter();
  const isAdmin = gate.role === "admin";
  const flags = await listFlags();
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("key")}</th>
              <th scope="col">{t("state")}</th>
              <th scope="col">{t("note")}</th>
              <th scope="col">{t("updated")}</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.key}>
                <td>
                  <code>{flag.key}</code>
                </td>
                <td>
                  {isAdmin ? (
                    <FlagForm flagKey={flag.key} state={flag.state} note={flag.note ?? ""} />
                  ) : (
                    t(flag.state)
                  )}
                </td>
                <td>{flag.note}</td>
                <td>{f.dateTime(flag.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
