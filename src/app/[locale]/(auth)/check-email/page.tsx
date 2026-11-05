import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ResendVerificationForm } from "@/components/auth/reset-forms";
import { IconMail } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.checkEmail");
  return { title: t("title") };
}

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  const t = await getTranslations("auth.checkEmail");
  return (
    <AuthScreen title={t("title")} icon={<IconMail />} centered>
      <p className="lead text-center">{t("lead", { email })}</p>
      {email ? <ResendVerificationForm email={email} /> : null}
      <Link href="/sign-in" className="btn btn-secondary btn-block">
        {t("toSignIn")}
      </Link>
    </AuthScreen>
  );
}
