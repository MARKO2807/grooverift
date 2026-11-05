import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { InviteCurrent } from "@/components/motifs/invite-current";
import { PublicShell } from "@/components/shell/public-shell";
import { IconLightning, IconLock, IconPulse, IconSend, IconUsers } from "@/components/ui/icons";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** PUB-01, the landing (D-076, D-085): one sentence, the invite current, three rows, "samo uz pozivnicu",
 *  no waitlist, the legal and notice links. Signed-in members go to Home. */
export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();
  if (session) redirect({ href: "/home", locale });
  const t = await getTranslations("landing");
  return (
    <PublicShell screen="landing">
      <div className="hero">
        <h1 className="h-hero" tabIndex={-1}>
          {t("title")}
        </h1>
        <p className="tagline" lang="en">
          {t("tagline")}
        </p>
        <InviteCurrent height={56} className="inv-wide" />
        <p className="lead">{t("lead")}</p>
      </div>
      <ul className="how-rows" aria-label={t("howLabel")}>
        <li>
          <IconPulse />
          <span>
            <b>{t("dropTitle")}</b> {t("dropText")}
          </span>
        </li>
        <li>
          <IconLightning />
          <span>
            <b>{t("dnaTitle")}</b> {t("dnaText")}
          </span>
        </li>
        <li>
          <IconUsers />
          <span>
            <b>{t("peopleTitle")}</b> {t("peopleText")}
          </span>
        </li>
      </ul>
      <div className="info-stack">
        <p>
          <IconLock />
          <span>
            <b>{t("inviteTitle")}</b> {t.rich("inviteText", { brand: () => <Wordmark inline /> })}{" "}
            <Link href="/about/alpha">{t("moreAlpha")}</Link>
          </span>
        </p>
        <p>
          <IconSend />
          <span>{t("haveInvite")}</span>
        </p>
      </div>
    </PublicShell>
  );
}
