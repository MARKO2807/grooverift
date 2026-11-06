import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { BlockMuteLists } from "@/components/safety/block-mute-lists";
import { memberPage } from "@/lib/auth/member-page";
import { blockedAndMuted } from "@/lib/data/safety";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safety.lists");
  return { title: t("title") };
}

/** SAFE-08: who the member blocked and muted, with Unblock and Unmute. */
export default async function BlockedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/blocked");
  const t = await getTranslations("safety.lists");
  const lists = await blockedAndMuted(session.user.id);
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      <BlockMuteLists blocked={lists.blocked} muted={lists.muted} />
    </AppShell>
  );
}
