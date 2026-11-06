import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { safeReturnTo } from "@/lib/routing/paths";
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

/**
 * The Google callback comes back here with ?error=<code> when it refuses (no account and no invitation for that
 * address, J1 E4) or fails. Only the kind is passed on; the raw code and description are never rendered.
 */
function oauthErrorOf(code: string | undefined): "noAccount" | "failed" | undefined {
  if (!code) return undefined;
  return code === "INVITE_EMAIL_MISMATCH" || code === "INVITE_REQUIRED" ? "noAccount" : "failed";
}

type Search = Promise<{ returnTo?: string; reset?: string; verified?: string; error?: string }>;

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
  const returnTo = safeReturnTo(sp.returnTo);
  const e = env();
  const googleEnabled = Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);

  return (
    <AuthScreen title={t("title")}>
      <SignInForm
        returnTo={returnTo}
        googleEnabled={googleEnabled}
        oauthError={oauthErrorOf(sp.error)}
        notice={sp.reset ? "reset" : sp.verified ? "verified" : undefined}
      />
    </AuthScreen>
  );
}
