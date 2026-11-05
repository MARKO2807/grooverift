import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/ui/notice";
import { Forbidden, requireRole, Unauthenticated } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Staff shell: every page under /admin passes this gate (role AND second factor, threat model §3). */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  try {
    await requireRole("editor", "moderator", "admin");
  } catch (error) {
    if (error instanceof Unauthenticated) {
      redirect({ href: { pathname: "/sign-in", query: { returnTo: "/admin" } }, locale });
    }
    const reason = error instanceof Forbidden ? error.reason : "ROLE";
    return (
      <AppShell title={t("forbidden.title")} backHref="/home">
        <Notice kind="warning">
          {reason === "TWO_FACTOR_REQUIRED" ? t("forbidden.twoFactor") : t("forbidden.role")}
        </Notice>
        {reason === "TWO_FACTOR_REQUIRED" ? (
          <Link href="/settings/security" className="btn btn-primary btn-block">
            {t("forbidden.toSettings")}
          </Link>
        ) : null}
      </AppShell>
    );
  }
  return (
    <AppShell title={t("title")} backHref="/home">
      <p className="lead">{t("lead")}</p>
      <nav aria-label={t("title")} className="foot-row">
        <Link href="/admin" className="btn btn-secondary btn-sm">
          {t("nav.overview")}
        </Link>
        <Link href="/admin/members" className="btn btn-secondary btn-sm">
          {t("nav.members")}
        </Link>
        <Link href="/admin/flags" className="btn btn-secondary btn-sm">
          {t("nav.flags")}
        </Link>
        <Link href="/admin/audit" className="btn btn-secondary btn-sm">
          {t("nav.audit")}
        </Link>
      </nav>
      {children}
    </AppShell>
  );
}
