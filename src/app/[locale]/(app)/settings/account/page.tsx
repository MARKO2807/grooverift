import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { ChangeEmailForm, GoogleRow } from "@/components/settings/account-forms";
import { IconChevron } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { memberPage } from "@/lib/auth/member-page";
import { accountFacts } from "@/lib/data/account";
import { settingsSummary } from "@/lib/data/settings";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.account");
  return { title: t("title") };
}

/**
 * SET-02 Account: the address (change confirmed from both addresses, R-16), Google sign-in when the provider is
 * configured (A7), and where the password and the @username live (Sigurnost and Uredi profil, D-109 (2)).
 */
export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ linked?: string }>;
}) {
  const { locale } = await params;
  const linked = (await searchParams).linked;
  const session = await memberPage(locale, "/settings/account");
  const t = await getTranslations("settings.account");
  const tg = await getTranslations("account.google");
  const [facts, summary] = await Promise.all([
    accountFacts(session.user.id),
    settingsSummary(session.user.id),
  ]);
  const google = Boolean(env().GOOGLE_CLIENT_ID);
  const rows = [
    { href: "/settings/security", title: t("password"), text: t("passwordText") },
    {
      href: "/settings/profile",
      title: t("username"),
      text: `@${summary?.username ?? ""} · ${t("usernameText")}`,
    },
  ];
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      <section className="form-stack" aria-labelledby="h-email">
        <h2 id="h-email" className="set-t">
          {t("email")}
        </h2>
        <ChangeEmailForm current={session.user.email} />
      </section>
      {google ? (
        <section className="form-stack" aria-labelledby="h-google">
          <h2 id="h-google" className="set-t">
            {tg("title")}
          </h2>
          {linked === "1" ? <Notice kind="success">{tg("linkedNow")}</Notice> : null}
          {linked === "0" ? <Notice kind="error">{tg("linkFailed")}</Notice> : null}
          <GoogleRow linked={facts?.google ?? false} canUnlink={facts?.hasPassword ?? false} />
        </section>
      ) : null}
      <ul className="set-list">
        {rows.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="set-link">
              <span className="set-txt">
                <span className="set-t">{r.title}</span>
                <span className="set-d">{r.text}</span>
              </span>
              <IconChevron />
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
