import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { NewPasswordForm } from "@/components/auth/reset-forms";
import { IconWarning } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("newTitle") };
}

export default async function ResetNewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = await getTranslations("auth.reset");
  const tl = await getTranslations("auth.linkInvalid");
  if (!token || error) {
    return (
      <AuthScreen title={tl("title")} icon={<IconWarning />} centered>
        <p className="lead text-center">{tl("reset")}</p>
        <Link href="/reset" className="btn btn-primary btn-block">
          {tl("requestNew")}
        </Link>
      </AuthScreen>
    );
  }
  return (
    <AuthScreen title={t("newTitle")}>
      <NewPasswordForm token={token} />
    </AuthScreen>
  );
}
