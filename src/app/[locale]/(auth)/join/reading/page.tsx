import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ReadingForm } from "@/components/onboarding/reading-form";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.reading");
  return { title: t("title") };
}

/** ONB-03 (J1 step 5): the optional reading languages; the interface language was chosen before the account. */
export default async function ReadingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "reading");
  const t = await getTranslations("join.reading");
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <ReadingForm initial={page.state?.readingLanguages ?? []} />
    </AuthScreen>
  );
}
