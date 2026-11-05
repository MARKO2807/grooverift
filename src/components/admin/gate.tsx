import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Notice } from "@/components/ui/notice";
import { staffGate, type StaffGate } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";

/** Runs the staff gate for a page and renders the refusal inside the admin shell (no nested shell).
 *  Returns the gate so the page can read the session and role. */
export async function adminPageGate(
  locale: string,
  returnTo: string,
  ...roles: Role[]
): Promise<Extract<StaffGate, { ok: true }> | { ok: false; element: React.ReactElement }> {
  const gate = await staffGate(...roles);
  if (gate.ok) return gate;
  if (gate.reason === "UNAUTHENTICATED") {
    redirect({ href: { pathname: "/sign-in", query: { returnTo } }, locale });
  }
  const t = await getTranslations("admin.forbidden");
  return {
    ok: false,
    element: (
      <section className="form-stack">
        <h2 className="set-t">{t("title")}</h2>
        <Notice kind="warning">
          {gate.reason === "TWO_FACTOR_REQUIRED" ? t("twoFactor") : t("role")}
        </Notice>
        {gate.reason === "TWO_FACTOR_REQUIRED" ? (
          <Link href="/settings/security" className="btn btn-primary btn-block">
            {t("toSettings")}
          </Link>
        ) : null}
      </section>
    ),
  };
}
