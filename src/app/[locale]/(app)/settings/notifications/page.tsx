import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { NotificationsScreen } from "@/components/settings/notifications";
import { memberPage } from "@/lib/auth/member-page";
import { deviceFor, pushAvailable, pushChoices } from "@/lib/data/push";
import { vapidPublicKey } from "@/lib/push/send";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("push");
  return { title: t("title") };
}

/**
 * SET-06 notifications (D-071, D-072; step 5.12). Push only (D-070, OQ-32), so the whole screen exists only while
 * push is available (the "push" flag and the VAPID pair, D-093 (1)); otherwise it is not found and Settings shows
 * no row for it.
 */
export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/notifications");
  const publicKey = vapidPublicKey();
  if (!publicKey || !(await pushAvailable())) notFound();
  const t = await getTranslations("push");
  const [device, choices] = await Promise.all([
    deviceFor(session.user.id, session.session.id),
    pushChoices(session.user.id),
  ]);
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      <NotificationsScreen
        publicKey={publicKey}
        device={{ on: device.on, pausedUntil: device.pausedUntil?.toISOString() ?? null }}
        types={choices.types}
        reminder={choices.reminder}
      />
    </AppShell>
  );
}
