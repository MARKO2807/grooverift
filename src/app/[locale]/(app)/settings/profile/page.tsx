import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { ChangeUsernameForm, EditProfileForm } from "@/components/settings/profile-forms";
import { IconChevron, IconPulse } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { memberPage } from "@/lib/auth/member-page";
import { ownProfile } from "@/lib/data/profiles";
import { notAvailable } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.profile");
  return { title: t("title") };
}

/** PROF-08 at /settings/profile (D-078): display name and bio, the Music DNA link, the username change (D-069). */
export default async function ProfileSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ renamed?: string }>;
}) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/profile");
  const own = await ownProfile(session.user.id);
  if (!own) notAvailable();
  const t = await getTranslations("settings.profile");
  const td = await getTranslations("dna");
  const renamed = (await searchParams).renamed === "1";
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      <section className="form-stack" aria-labelledby="h-basics">
        <h2 id="h-basics" className="set-t">
          {t("basics")}
        </h2>
        <EditProfileForm displayName={own.displayName} bio={own.bio} />
      </section>
      <ul className="set-list">
        <li>
          <Link href="/me/dna" className="set-link">
            <IconPulse />
            <span className="set-txt">
              <span className="set-t">{td("edit")}</span>
            </span>
            <IconChevron />
          </Link>
        </li>
      </ul>
      <section className="form-stack" aria-labelledby="h-username">
        <h2 id="h-username" className="set-t">
          {t("usernameTitle")}
        </h2>
        {renamed ? (
          <Notice kind="success" focusable>
            {t("renamed", { username: own.username })}
          </Notice>
        ) : null}
        <ChangeUsernameForm username={own.username} nextAt={own.usernameNextAt} />
      </section>
    </AppShell>
  );
}
