import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Wordmark } from "@/components/brand/wordmark";
import { InviteCurrent } from "@/components/motifs/invite-current";
import {
  IconCheck,
  IconDevice,
  IconInfo,
  IconPlusSquare,
  IconUser,
  IconWarning,
} from "@/components/ui/icons";
import { getSession } from "@/lib/auth/session";
import { invitationByToken, invitationEmail } from "@/lib/data/invitations";
import { onboardingState } from "@/lib/data/onboarding";
import { signOutToJoinAction } from "@/lib/onboarding/actions";
import { inviteTokenFromCookies } from "@/lib/onboarding/cookies";
import { PATHS } from "@/lib/onboarding/steps";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.invite");
  return { title: t("title") };
}

/**
 * PUB-05, the invitation (J1 step 1; copy D-063 (2), layout D-059): one sentence about GrooveRift and the alpha,
 * the PWA note and "Prihvati pozivnicu". The same page answers the edge cases: a token that cannot be used shows
 * one neutral page without a reason (E1); a signed-in member sees "already have an account" for their own address
 * or "sign out to accept" for another one, and nothing is consumed (E3).
 */
export default async function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("join.invite");
  const token = await inviteTokenFromCookies();
  if (!token) redirect({ href: "/", locale });
  const [invite, session] = await Promise.all([invitationByToken(token), getSession()]);

  if (session) {
    const state = await onboardingState(session.user.id);
    if (!state.onboarded) redirect({ href: PATHS[state.step], locale });
    // The address the invite was sent to, even once it is used: the same address means "nothing to do" (E3).
    const same = (await invitationEmail(token)) === session.user.email.toLowerCase();
    return (
      <AuthScreen
        title={same ? t("signedSameTitle") : t("signedOtherTitle")}
        icon={same ? <IconCheck /> : <IconUser />}
        centered
      >
        <p className="lead text-center">
          {same
            ? t("signedSameLead", { email: session.user.email })
            : t("signedOtherLead", { username: state.username ?? session.user.name })}
        </p>
        <p className="meta text-center">{t("signedNote")}</p>
        {same ? (
          <Link href="/home" className="btn btn-primary btn-block">
            {t("toHome")}
          </Link>
        ) : (
          <div className="foot-row">
            <Link href="/home" className="btn btn-secondary">
              {t("stay")}
            </Link>
            <form action={signOutToJoinAction} className="contents">
              <button type="submit" className="btn btn-secondary btn-block">
                {t("signOut")}
              </button>
            </form>
          </div>
        )}
      </AuthScreen>
    );
  }

  if (!invite.usable) {
    return (
      <AuthScreen title={t("badTitle")} icon={<IconWarning />} centered>
        <p className="lead text-center">{t("badLead")}</p>
        <Link href="/" className="btn btn-primary btn-block">
          {t("toLanding")}
        </Link>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title={t("title")}>
      <div className="join-hero">
        <p className="eyebrow">{t("eyebrow")}</p>
        <p className="tagline" lang="en">
          {t("tagline")}
        </p>
        <InviteCurrent height={56} className="inv-wide" />
        <p className="lead">{t("lead")}</p>
      </div>
      <div className="info-stack">
        <p>
          <IconInfo />
          <span>
            {t("alphaNote")}{" "}
            <Link href="/about/alpha" className="link">
              {t("moreAlpha")}
            </Link>
          </span>
        </p>
        <p>
          <IconDevice />
          <span>{t.rich("pwa", { brand: () => <Wordmark inline /> })}</span>
        </p>
        <p>
          <IconPlusSquare />
          <span>{t("install")}</span>
        </p>
      </div>
      <Link href={PATHS.age} className="btn btn-primary btn-block">
        {t("accept")}
      </Link>
      <p className="fine">{t("validFor", { email: invite.email })}</p>
    </AuthScreen>
  );
}
