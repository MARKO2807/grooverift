import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/profile/avatar";
import { MotionSwitch } from "@/components/settings/motion-switch";
import { SignOutButton } from "@/components/settings/sign-out";
import {
  IconBell,
  IconBlock,
  IconCheck,
  IconChevron,
  IconClock,
  IconEye,
  IconGlobe,
  IconHelp,
  IconInfo,
  IconLockSimple,
  IconMail,
  IconPulse,
  IconShield,
  IconTrash,
  IconUsers,
} from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { roleOf } from "@/lib/auth/session";
import { ownPhotoId } from "@/lib/data/media";
import { activeRestriction, blockMuteCounts } from "@/lib/data/safety";
import { pushAvailable, pushChoices } from "@/lib/data/push";
import { settingsSummary } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

// i18n-keys: settings.privacy.audience.everyone settings.privacy.audience.followers settings.privacy.audience.me
// i18n-keys: settings.privacy.audience.mutuals settingsIndex.visibility.public settingsIndex.visibility.private
// i18n-keys: settingsIndex.visibility.none settingsIndex.lang.hr settingsIndex.lang.en

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settingsIndex");
  return { title: t("title") };
}

type Row = { href: string; Icon: React.ComponentType; title: string; text?: string };

/** The city part of an IANA zone for the row ("Europe/Zagreb" → "Zagreb"). */
const city = (tz: string) => (tz.split("/").pop() ?? tz).replaceAll("_", " ");

/**
 * SET-01, arrangement B "Kartica profila" (D-066): the member's name and @username on top (opens Edit profile),
 * the quiet account status under it, four groups, Log out, and "Deaktiviraj ili izbriši račun" at the very bottom
 * (D-063 (9)). Notifications (SET-06) sit in the Aplikacija group while push is available (step 5.12).
 */
export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings");
  const userId = session.user.id;
  const t = await getTranslations("settingsIndex");
  const tp = await getTranslations("settings.privacy");
  const ts = await getTranslations("safety");
  const f = await getFormatter();
  const [summary, counts, restriction, push, photoId] = await Promise.all([
    settingsSummary(userId),
    blockMuteCounts(userId),
    activeRestriction(userId),
    pushAvailable().then((ok) => (ok ? pushChoices(userId) : null)),
    ownPhotoId(userId),
  ]);
  const name = summary?.displayName ?? session.user.name;
  const username = summary?.username ?? "";

  const groups: { id: string; title: string; rows: Row[] }[] = [
    {
      id: "account",
      title: t("groupAccount"),
      rows: [
        {
          href: "/settings/account",
          Icon: IconMail,
          title: t("account"),
          text: t("accountText", { username }),
        },
        {
          href: "/settings/security",
          Icon: IconShield,
          title: t("security"),
          text: t("securityText"),
        },
      ],
    },
    {
      id: "privacy",
      title: t("groupPrivacy"),
      rows: [
        {
          href: "/settings/privacy",
          Icon: IconEye,
          title: t("privacy"),
          text: t("privacyText", {
            profile: t(`visibility.${summary?.visibility ?? "none"}`),
            dna: tp(`audience.${summary?.musicDna ?? "me"}`).toLocaleLowerCase(locale),
          }),
        },
        {
          href: "/settings/blocked",
          Icon: IconBlock,
          title: ts("lists.title"),
          text:
            counts.blocked || counts.muted
              ? ts("lists.summary", { blocked: counts.blocked, muted: counts.muted })
              : ts("lists.nobody"),
        },
      ],
    },
    {
      id: "app",
      title: t("groupApp"),
      rows: [
        // SET-06 (step 5.12): only while push is available (the "push" flag, D-093 (1)).
        ...(push
          ? [
              {
                href: "/settings/notifications",
                Icon: IconBell,
                title: t("notifications"),
                text: push.reminder.enabled
                  ? t("notificationsOn", { time: push.reminder.localTime })
                  : t("notificationsOff"),
              },
            ]
          : []),
        {
          href: "/settings/language",
          Icon: IconGlobe,
          title: t("language"),
          text: t("languageText", {
            language: t(`lang.${summary?.locale ?? "hr"}`),
            zone: city(summary?.timeZone ?? "Europe/Zagreb"),
          }),
        },
      ],
    },
    {
      id: "help",
      title: t("groupHelp"),
      rows: [
        { href: "/settings/help", Icon: IconHelp, title: t("help"), text: t("helpText") },
        { href: "/legal/guidelines", Icon: IconUsers, title: t("guidelines") },
        { href: "/legal/terms", Icon: IconInfo, title: t("legal"), text: t("legalText") },
        { href: "/settings/about", Icon: IconPulse, title: t("about"), text: t("aboutText") },
      ],
    },
  ];
  if (STAFF_ROLES.includes(roleOf(session)))
    groups[0]!.rows.push({ href: "/admin", Icon: IconLockSimple, title: t("admin") });

  const statusText = restriction
    ? t("statusRestricted", {
        date: f.dateTime(restriction.endsAt, { day: "numeric", month: "long" }),
      })
    : t("statusOk");

  return (
    <AppShell title={t("title")} backHref="/me" nav="settings" screen="narrow">
      <Link href="/settings/profile" className="set-me">
        <Avatar name={name} size="sm" photo={photoId} />
        <span className="set-txt">
          <span className="set-t">{name}</span>
          <span className="set-d">
            @{username} · {t("editProfile")}
          </span>
        </span>
        <IconChevron />
      </Link>
      <Link
        href="/settings/status"
        className={`set-status${restriction ? " set-status-warn" : ""}`}
      >
        {restriction ? <IconClock /> : <IconCheck />}
        <span>{statusText}</span>
        <span className="sr-only">{t("statusSuffix")}</span>
      </Link>
      <div className="set-body">
        {groups.map((g) => (
          <section key={g.id} className="set-group" aria-labelledby={`sg-${g.id}`}>
            <h2 className="set-gt" id={`sg-${g.id}`}>
              {g.title}
            </h2>
            <ul className="set-list">
              {g.rows.map(({ href, Icon, title, text }) => (
                <li key={href}>
                  <Link href={href} className="set-link">
                    <span className="set-ic-wrap" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="set-txt">
                      <span className="set-t">{title}</span>
                      {text ? <span className="set-d">{text}</span> : null}
                    </span>
                    <IconChevron />
                  </Link>
                </li>
              ))}
              {g.id === "app" ? <MotionSwitch initial={summary?.reduceMotion ?? false} /> : null}
            </ul>
          </section>
        ))}
      </div>
      <div className="set-foot">
        <SignOutButton />
        <Link href="/settings/data" className="set-delete">
          <IconTrash />
          {t("close")}
        </Link>
      </div>
      <p className="meta set-ver">{t("version")}</p>
    </AppShell>
  );
}
