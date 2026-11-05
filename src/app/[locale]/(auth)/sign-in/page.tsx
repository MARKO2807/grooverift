import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title") };
}

type Search = Promise<{ returnTo?: string; reset?: string; verified?: string }>;

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Search;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (session) redirect({ href: "/home", locale });

  const t = await getTranslations("auth.signIn");
  const returnTo =
    sp.returnTo && sp.returnTo.startsWith("/") && !sp.returnTo.startsWith("//")
      ? sp.returnTo
      : "/home";
  const e = env();
  const googleEnabled = Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);

  return (
    <AuthScreen title={t("title")}>
      <SignInForm
        returnTo={returnTo}
        googleEnabled={googleEnabled}
        notice={sp.reset ? "reset" : sp.verified ? "verified" : undefined}
      />
    </AuthScreen>
  );
}
