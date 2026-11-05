import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Notice } from "@/components/ui/notice";
import { staffGate } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title") };
}

/** Staff shell. The layout gate shapes the UI; EVERY page under /admin runs the gate again itself
 *  (adminPageGate), because Next.js can render a page without re-running its layout. */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const gate = await staffGate("editor", "moderator", "admin");
  if (!gate.ok) {
    if (gate.reason === "UNAUTHENTICATED") {
      redirect({ href: { pathname: "/sign-in", query: { returnTo: "/admin" } }, locale });
    }
    return (
      <AppShell title={t("forbidden.title")} backHref="/settings" nav="settings" screen="narrow">
        <Notice kind="warning">
          {gate.reason === "TWO_FACTOR_REQUIRED" ? t("forbidden.twoFactor") : t("forbidden.role")}
        </Notice>
        {gate.reason === "TWO_FACTOR_REQUIRED" ? (
          <Link href="/settings/security" className="btn btn-primary btn-block">
            {t("forbidden.toSettings")}
          </Link>
        ) : null}
      </AppShell>
    );
  }
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings">
      <p className="lead">{t("lead")}</p>
      <nav aria-label={t("nav.label")} className="foot-row">
        <Link href="/admin" className="btn btn-secondary btn-sm">
          {t("nav.overview")}
        </Link>
        <Link href="/admin/members" className="btn btn-secondary btn-sm">
          {t("nav.members")}
        </Link>
        <Link href="/admin/flags" className="btn btn-secondary btn-sm">
          {t("nav.flags")}
        </Link>
        {gate.role === "admin" ? (
          <>
            <Link href="/admin/invites" className="btn btn-secondary btn-sm">
              {t("nav.invites")}
            </Link>
            <Link href="/admin/audit" className="btn btn-secondary btn-sm">
              {t("nav.audit")}
            </Link>
          </>
        ) : null}
      </nav>
      {children}
    </AppShell>
  );
}
