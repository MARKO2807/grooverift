import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { UsernameForm } from "@/components/onboarding/username-form";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.username");
  return { title: t("title") };
}

/** ONB-02 (J1 step 4): "Kako se zoveš?" (D-053), the display name and the @username. */
export default async function UsernamePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "username");
  const t = await getTranslations("join.username");
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <UsernameForm
        initial={{
          displayName: page.state?.displayName ?? "",
          username: page.state?.username ?? "",
        }}
      />
    </AuthScreen>
  );
}
