import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/settings/sign-out";
import {
  IconChevron,
  IconEye,
  IconLockSimple,
  IconMail,
  IconShield,
  IconUser,
  IconBlock,
  IconShield as IconStatus,
} from "@/components/ui/icons";
import { blockMuteCounts } from "@/lib/data/safety";
import { memberPage } from "@/lib/auth/member-page";
import { roleOf } from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settingsIndex");
  return { title: t("title") };
}

/** SET-01, minimal: the groups that exist today (profile and privacy since 5.5). Step 5.10 builds the full index (arrangement B, D-066). */
export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings");
  const t = await getTranslations("settingsIndex");
  const th = await getTranslations("home");
  const ts = await getTranslations("safety");
  const counts = await blockMuteCounts(session.user.id);
  const rows = [
    { href: "/settings/profile", Icon: IconUser, title: t("profile"), text: t("profileText") },
    { href: "/settings/privacy", Icon: IconEye, title: t("privacy"), text: t("privacyText") },
    { href: "/settings/security", Icon: IconShield, title: t("security"), text: t("securityText") },
    { href: "/settings/account", Icon: IconMail, title: t("account"), text: t("accountText") },
    {
      href: "/settings/blocked",
      Icon: IconBlock,
      title: ts("lists.title"),
      text:
        counts.blocked || counts.muted
          ? ts("lists.summary", { blocked: counts.blocked, muted: counts.muted })
          : ts("lists.nobody"),
    },
    {
      href: "/settings/status",
      Icon: IconStatus,
      title: ts("status.title"),
      text: ts("status.rowText"),
    },
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
      <SignOutButton />
    </AppShell>
  );
}
