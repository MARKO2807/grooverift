import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ReminderForm } from "@/components/onboarding/reminder-form";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.reminder");
  return { title: t("title") };
}

/** ONB-08 (J1 step 10): shown only while the push flag is on (D-093 (1)); the page helper redirects otherwise. */
export default async function ReminderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "reminder");
  const t = await getTranslations("join.reminder");
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <ReminderForm initial={page.state?.reminder ?? null} />
    </AuthScreen>
  );
}
