import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { BuildingPlaceholder } from "@/components/system/states";
import { memberPage } from "@/lib/auth/member-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("activity") };
}

/** ACT-01 placeholder; Activity arrives in step 5.8. */
export default async function ActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await memberPage(locale, "/activity");
  const t = await getTranslations("nav");
  const tp = await getTranslations("placeholder");
  return (
    <AppShell title={t("activity")} nav="activity" screen="activity">
      <BuildingPlaceholder text={tp("activity")} />
    </AppShell>
  );
}
