import { getFormatter, getTranslations } from "next-intl/server";
import { listFlags } from "@/lib/flags";
import { getSession, roleOf } from "@/lib/auth/session";
import { FlagForm } from "@/components/admin/forms";

export default async function AdminFlagsPage() {
  const t = await getTranslations("admin.flags");
  const f = await getFormatter();
  const session = await getSession();
  const isAdmin = roleOf(session) === "admin";
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
