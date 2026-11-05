import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { PrivacyRows } from "@/components/settings/privacy-rows";
import { memberPage } from "@/lib/auth/member-page";
import { privacyState } from "@/lib/data/profiles";
import { notAvailable } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.privacy");
  return { title: t("title") };
}

/** SET-05 at /settings/privacy: profile visibility, discoverability and the per-section audiences (D-070 (5)). */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/privacy");
  const state = await privacyState(session.user.id);
  if (!state) notAvailable();
  const t = await getTranslations("settings.privacy");
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      <p className="lead lead-sm">{t("lead")}</p>
      <PrivacyRows initial={state} />
    </AppShell>
  );
}
