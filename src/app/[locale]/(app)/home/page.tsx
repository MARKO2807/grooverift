import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { BuildingPlaceholder } from "@/components/system/states";
import { signOutAction } from "@/lib/auth/actions";
import { memberPage } from "@/lib/auth/member-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title") };
}

/** HOME-01 placeholder in the real shell. Today's Drop and the first answers arrive in step 5.7. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/home");
  const t = await getTranslations("home");
  return (
    <AppShell title={t("title")} nav="home" home screen="home">
      <p className="lead">{t("signedInAs", { name: session.user.name })}</p>
      <BuildingPlaceholder text={t("lead")} />
      <form action={signOutAction}>
        <button type="submit" className="btn btn-secondary">
          {t("signOut")}
        </button>
      </form>
    </AppShell>
  );
}
