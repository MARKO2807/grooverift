import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { ChangeEmailForm } from "@/components/settings/account-forms";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.account");
  return { title: t("title") };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();
  if (!session)
    redirect({ href: { pathname: "/sign-in", query: { returnTo: "/settings/account" } }, locale });
  const t = await getTranslations("settings.account");
  return (
    <AppShell title={t("title")} backHref="/home">
      <section className="form-stack" aria-labelledby="h-email">
        <h2 id="h-email" className="set-t">
          {t("email")}
        </h2>
        <ChangeEmailForm current={session!.user.email} />
      </section>
    </AppShell>
  );
}
