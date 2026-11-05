import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Wordmark } from "@/components/brand/wordmark";
import { PATHS } from "@/lib/onboarding/steps";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.minor");
  return { title: t("title") };
}

/** J1 E5: a short, kind page; no account, nothing stored, the invitation untouched. */
export default async function MinorPage() {
  const t = await getTranslations("join.minor");
  return (
    <AuthScreen title={t("title")} centered back={PATHS.age}>
      <p className="lead text-center">{t.rich("lead", { brand: () => <Wordmark inline /> })}</p>
      <p className="text-center">{t("mistake")}</p>
      <p className="text-center">
        <Link href="/legal/guidelines" className="link">
          {t("rules")}
        </Link>
      </p>
      <Link href={PATHS.age} className="btn btn-secondary btn-block">
        {t("back")}
      </Link>
    </AuthScreen>
  );
}
