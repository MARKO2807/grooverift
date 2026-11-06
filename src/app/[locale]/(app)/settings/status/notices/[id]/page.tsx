import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { NoticeView } from "@/components/safety/notice-view";
import { memberPage } from "@/lib/auth/member-page";
import { myNotices } from "@/lib/data/safety";
import { notAvailable } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safety.status");
  return { title: t("notice") };
}

/** SAFE-05 detail with the SAFE-06 appeal. Only the member's own decisions; anything else is "not available". */
export default async function NoticePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await memberPage(locale, `/settings/status/notices/${id}`);
  const [n] = await myNotices(session.user.id, id);
  if (!n) notAvailable();
  const t = await getTranslations("safety.status");
  return (
    <AppShell
      title={t("notice")}
      backHref="/settings/status/notices"
      nav="settings"
      screen="narrow"
    >
      <NoticeView n={n} />
    </AppShell>
  );
}
