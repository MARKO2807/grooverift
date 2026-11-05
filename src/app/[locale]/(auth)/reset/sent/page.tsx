import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { IconMail } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("sentTitle") };
}

export default async function ResetSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  const t = await getTranslations("auth.reset");
  return (
    <AuthScreen title={t("sentTitle")} icon={<IconMail />} centered>
      <p className="lead text-center">{t("sentLead", { email })}</p>
      <p className="fine">{t("sentAgain")}</p>
      <Link href="/sign-in" className="btn btn-secondary btn-block">
        {t("backToSignIn")}
      </Link>
    </AuthScreen>
  );
}
