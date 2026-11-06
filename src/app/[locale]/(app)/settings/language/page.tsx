import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { LanguageForm } from "@/components/settings/language-form";
import { memberPage } from "@/lib/auth/member-page";
import { settingsSummary } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.language");
  return { title: t("title") };
}

/** SET-07 language and region (IA): interface language, reading languages, time zone (for the reminder). */
export default async function LanguagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/language");
  const t = await getTranslations("account.language");
  const s = await settingsSummary(session.user.id);
  const zones = Intl.supportedValuesOf("timeZone");
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      <LanguageForm
        locale={locale === "en" ? "en" : "hr"}
        reading={s?.readingLanguages ?? []}
        timeZone={s?.timeZone ?? "Europe/Zagreb"}
        zones={zones}
      />
    </AppShell>
  );
}
