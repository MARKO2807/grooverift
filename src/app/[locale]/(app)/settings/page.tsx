import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { IconChevron, IconLockSimple, IconMail, IconShield } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { roleOf } from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settingsIndex");
  return { title: t("title") };
}

/** SET-01, minimal: the groups that exist today. Step 5.10 builds the full index (arrangement B, D-066). */
export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings");
  const t = await getTranslations("settingsIndex");
  const th = await getTranslations("home");
  const rows = [
    { href: "/settings/security", Icon: IconShield, title: t("security"), text: t("securityText") },
    { href: "/settings/account", Icon: IconMail, title: t("account"), text: t("accountText") },
  ];
  if (STAFF_ROLES.includes(roleOf(session)))
    rows.push({ href: "/admin", Icon: IconLockSimple, title: th("admin"), text: "" });
  return (
    <AppShell title={t("title")} backHref="/me" nav="settings" screen="narrow">
      <ul className="set-list">
        {rows.map(({ href, Icon, title, text }) => (
          <li key={href}>
            <Link href={href} className="set-link">
              <Icon />
              <span className="set-txt">
                <span className="set-t">{title}</span>
                {text ? <span className="set-d">{text}</span> : null}
              </span>
              <IconChevron />
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
