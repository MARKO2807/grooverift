import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitch } from "@/components/locale-switch";
import { signOutAction } from "@/lib/auth/actions";
import { getSession, roleOf } from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title") };
}

/** Signed-in placeholder (Phase 5 brings Home). Shows the session works and offers sign-out. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect({ href: { pathname: "/sign-in", query: { returnTo: "/home" } }, locale });
  const t = await getTranslations("home");
  const role = roleOf(session);
  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          <Wordmark />
        </div>
        <LocaleSwitch />
      </header>
      <main id="main" tabIndex={-1} className="screen-onb">
        <h1 tabIndex={-1}>{t("title")}</h1>
        <p className="lead">{t("signedInAs", { name: session!.user.name })}</p>
        <p className="lead">{t("lead")}</p>
        <div className="form-stack">
          <Link href="/settings/security" className="btn btn-secondary btn-block">
            {t("settings")}
          </Link>
          {STAFF_ROLES.includes(role) ? (
            <Link href="/admin" className="btn btn-secondary btn-block">
              {t("admin")}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button type="submit" className="btn btn-secondary btn-block">
              {t("signOut")}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
