import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { VisibilityForm } from "@/components/onboarding/visibility-form";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.visibility");
  return { title: t("title") };
}

/** ONB-04 (J1 step 6, D-025, D-030, D-034): the neutral active choice; required. */
export default async function VisibilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "visibility");
  const t = await getTranslations("join.visibility");
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <VisibilityForm initial={page.state?.visibility ?? null} />
    </AuthScreen>
  );
}
