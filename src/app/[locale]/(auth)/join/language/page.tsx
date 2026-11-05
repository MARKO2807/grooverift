import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ChoiceForm } from "@/components/onboarding/choice-form";
import { IconGlobe } from "@/components/ui/icons";
import { languageAction } from "@/lib/onboarding/actions";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.language");
  return { title: t("title") };
}

/** The interface language (D-060 (a), D-063 (3)): HR or EN, pre-selected from the invitation's language or the URL. */
export default async function LanguagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "language");
  const t = await getTranslations("join.language");
  return (
    <AuthScreen
      title={t("title")}
      icon={<IconGlobe />}
      centered
      back={page.back}
      progress={page.progress}
    >
      <p className="lead text-center" lang="en">
        {t("leadEn")}
      </p>
      <ChoiceForm
        action={languageAction}
        name="locale"
        legend={t("legend")}
        options={[
          { value: "hr", label: "Hrvatski", lang: "hr" },
          { value: "en", label: "English", lang: "en" },
        ]}
        initial={page.locale}
        submit={t("next")}
      >
        <p className="fine">{t("fine")}</p>
      </ChoiceForm>
    </AuthScreen>
  );
}
