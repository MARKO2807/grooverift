import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { BuildingPlaceholder, FeaturePaused } from "@/components/system/states";
import { memberPage } from "@/lib/auth/member-page";
import { flagState } from "@/lib/flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("hub") };
}

/** HUB-01 placeholder. The Daily Drop screens arrive in step 5.7; the paused state (SYS-04) is live already. */
export default async function HubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await memberPage(locale, "/hub");
  const t = await getTranslations("nav");
  const tp = await getTranslations("placeholder");
  const paused = (await flagState("daily_drop")) === "paused";
  return (
    <AppShell title={t("hub")} nav="hub" screen="hub">
      {paused ? (
        <FeaturePaused feature="daily_drop" homeLink />
      ) : (
        <BuildingPlaceholder text={tp("hub")} />
      )}
    </AppShell>
  );
}
