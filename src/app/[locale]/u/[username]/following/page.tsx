import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ListPage } from "@/components/profile/list-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.lists");
  return { title: t("following") };
}

/** `/@<username>/following` (PROF-07). */
export default async function FollowingPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  return <ListPage locale={locale} username={username} which="following" />;
}
