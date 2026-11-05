import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Notice } from "@/components/ui/notice";
import { getSession } from "@/lib/auth/session";
import { isEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("title") };
}

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await getSession()) redirect({ href: "/home", locale });
  const t = await getTranslations("auth.signUp");
  const open = await isEnabled("sign_up", { role: "member" });
  return (
    <AuthScreen title={t("title")}>
      {open ? <SignUpForm /> : <Notice kind="info">{t("closed")}</Notice>}
    </AuthScreen>
  );
}
