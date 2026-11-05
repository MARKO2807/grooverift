import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { BlockedByYouScreen, ProfileScreen } from "@/components/profile/profile-screen";
import { PublicShell } from "@/components/shell/public-shell";
import { IconGear } from "@/components/ui/icons";
import { env } from "@/lib/env";
import { notAvailable, profileView } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, username } = await params;
  const view = await profileView(locale, username);
  const t = await getTranslations("profile");
  // A hidden profile's title is the same as an unknown one's (IA8); the page itself answers 404.
  return { title: view.kind === "not-available" ? t("title") : view.displayName };
}

/**
 * `/@<username>` (PROF-01, PROF-10, PUB-08; rewritten here by src/proxy.ts). Every hidden reason (unknown,
 * reserved, deleted, deactivated, unfinished, private to a visitor, blocked by the owner) answers the one
 * "nije dostupno" page with 404 (IA8, U-02, U-04). The blocker's own view is the J4 B state.
 */
export default async function ProfilePage({ params }: { params: Params }) {
  const { locale, username } = await params;
  const lang = locale === "en" ? "en" : "hr";
  const view = await profileView(locale, username);
  const { viewer, session } = view;
  if (view.kind === "not-available") notAvailable();
  const t = await getTranslations("profile");

  if (!session) {
    // PUB-08: the minimal public profile in the visitor shell.
    if (view.kind !== "profile") notAvailable();
    return (
      <PublicShell screen="profile">
        <ProfileScreen view={view} viewer={viewer} locale={lang} appUrl={env().APP_URL} />
      </PublicShell>
    );
  }

  if (view.kind === "blocked-by-you") {
    return (
      <AppShell title={view.displayName} backHref="/home" bodyHeading screen="profile">
        <BlockedByYouScreen view={view} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={view.displayName}
      backHref={view.self ? undefined : "/home"}
      nav={view.self ? "profile" : undefined}
      bodyHeading
      screen="profile"
      actions={
        view.self ? (
          <Link href="/settings" className="iconbtn" aria-label={t("settings")}>
            <IconGear />
          </Link>
        ) : undefined
      }
    >
      <ProfileScreen view={view} viewer={viewer} locale={lang} appUrl={env().APP_URL} />
    </AppShell>
  );
}
