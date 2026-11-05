import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ChoiceForm } from "@/components/onboarding/choice-form";
import { Wordmark } from "@/components/brand/wordmark";
import { IconUsers } from "@/components/ui/icons";
import { ageAction } from "@/lib/onboarding/actions";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.age");
  return { title: t("title") };
}

/** ONB-01 (D-051, D-060 (b)): one question, two equal answers, no date of birth; nothing stored before the account. */
export default async function AgePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { locale } = await params;
  const { e } = await searchParams;
  const page = await stepPage(locale, "age");
  const t = await getTranslations("join.age");
  const te = await getTranslations("authErrors");
  return (
    <AuthScreen
      title={t("title")}
      icon={<IconUsers />}
      centered
      back={page.back}
      progress={page.progress}
    >
      <p className="lead text-center">{t.rich("lead", { brand: () => <Wordmark inline /> })}</p>
      <ChoiceForm
        action={ageAction}
        name="age"
        legend={t("legend")}
        options={[
          { value: "adult", label: t("adult") },
          { value: "minor", label: t("minor") },
        ]}
        error={e ? te("chooseAge") : null}
        submit={t("next")}
      />
    </AuthScreen>
  );
}
