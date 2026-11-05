import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Spirala } from "@/components/motifs/spirala";
import { IconBell, IconGlobe, IconLock, IconPulse, IconUsers } from "@/components/ui/icons";
import { getSession } from "@/lib/auth/session";
import { ownMusicDna } from "@/lib/data/music-dna";
import { onboardingState } from "@/lib/data/onboarding";
import { PATHS } from "@/lib/onboarding/steps";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.done");
  return { title: t("title") };
}

// i18n-keys: join.done.audience.everyone join.done.audience.followers join.done.audience.me join.done.audience.mutuals

/** ONB-09 "Spremno." (D-063 (6), D-060 (e)): what was chosen, in four facts, then Home with today's Drop. */
export default async function DonePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect({ href: "/join", locale });
  const state = await onboardingState(session!.user.id);
  if (!state.onboarded) redirect({ href: PATHS[state.step], locale });
  const t = await getTranslations("join.done");
  const own = await ownMusicDna(session!.user.id, locale === "en" ? "en" : "hr");
  return (
    <AuthScreen title={t("title")}>
      <p className="lead lead-done text-center">{t("lead")}</p>
      {own.genres.length ? (
        <div className="dna-live">
          <Spirala
            genres={own.genres.map((g) => ({ name: g.name, traitKey: g.traitKey, key: g.slug }))}
            caption={t("dnaCaption")}
            height={200}
          />
        </div>
      ) : null}
      <dl className="facts-grid">
        <div>
          {state.visibility === "public" ? <IconGlobe /> : <IconLock />}
          <dt>{t("profile")}</dt>
          <dd>{state.visibility === "public" ? t("public") : t("private")}</dd>
        </div>
        <div>
          <IconPulse />
          <dt>Music DNA</dt>
          <dd>{t("genres", { count: own.genres.length })}</dd>
        </div>
        <div>
          <IconUsers />
          <dt>{t("dnaAudience")}</dt>
          <dd>{t(`audience.${state.dnaAudience}`)}</dd>
        </div>
        <div>
          <IconBell />
          <dt>{t("reminder")}</dt>
          <dd>
            {state.reminder?.enabled
              ? t("reminderOn", { time: state.reminder.localTime.slice(0, 5) })
              : t("reminderOff")}
          </dd>
        </div>
      </dl>
      <p className="fine">{t("fine")}</p>
      <Link href="/home" className="btn btn-primary btn-block">
        {t("home")}
      </Link>
    </AuthScreen>
  );
}
