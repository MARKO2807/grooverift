import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { IconCheck, IconWarning } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verified");
  return { title: t("title") };
}

/** Better Auth sends the member here after /api/auth/verify-email; a bad token arrives as ?error=. */
export default async function VerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const t = await getTranslations("auth.verified");
  const tl = await getTranslations("auth.linkInvalid");
  if (error) {
    return (
      <AuthScreen title={tl("title")} icon={<IconWarning />} centered>
        <p className="lead text-center">{tl("verify")}</p>
        <Link href="/sign-in" className="btn btn-primary btn-block">
          {tl("toSignIn")}
        </Link>
      </AuthScreen>
    );
  }
  return (
    <AuthScreen title={t("title")} icon={<IconCheck />} centered>
      <p className="lead text-center">{t("lead")}</p>
      <Link
        href={{ pathname: "/sign-in", query: { verified: "1" } }}
        className="btn btn-primary btn-block"
      >
        {t("signIn")}
      </Link>
    </AuthScreen>
  );
}
