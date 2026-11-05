import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AccountForm } from "@/components/onboarding/account-form";
import { env } from "@/lib/env";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.account");
  return { title: t("title") };
}

/** /join (J1 step 3): the account for the invitation's address, by password (D-061) or Google (E4 on mismatch). */
export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const page = await stepPage(locale, "account");
  const t = await getTranslations("join.account");
  const e = env();
  const googleEnabled = Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
  const email = page.invite.usable ? page.invite.email : "";
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <AccountForm
        email={email}
        googleEnabled={googleEnabled}
        oauthError={error ? error.slice(0, 40) : undefined}
      />
    </AuthScreen>
  );
}
