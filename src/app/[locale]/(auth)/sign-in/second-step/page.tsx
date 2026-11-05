import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { SecondStepForm } from "@/components/auth/second-step-form";
import { IconShield } from "@/components/ui/icons";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.secondStep");
  return { title: t("title") };
}

export default async function SecondStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  if (await getSession()) redirect({ href: "/home", locale });
  const t = await getTranslations("auth.secondStep");
  const returnTo =
    sp.returnTo && sp.returnTo.startsWith("/") && !sp.returnTo.startsWith("//")
      ? sp.returnTo
      : "/home";
  return (
    <AuthScreen title={t("title")} icon={<IconShield />} centered>
      <SecondStepForm returnTo={returnTo} />
    </AuthScreen>
  );
}
