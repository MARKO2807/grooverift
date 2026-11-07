import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DnaPicker } from "@/components/onboarding/dna-picker";
import { FeaturePaused } from "@/components/system/states";
import { genreSuggestions, ownMusicDna } from "@/lib/data/music-dna";
import { flagState } from "@/lib/flags";
import { skipDnaAction } from "@/lib/onboarding/actions";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.dna");
  return { title: t("title") };
}

/** ONB-05 (J1 step 7): "Što slušaš?"; a paused Music DNA (SYS-04) lets the member continue without picks. */
export default async function DnaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "dna");
  const t = await getTranslations("join.dna");
  if ((await flagState("music_dna")) === "paused") {
    return (
      <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
        <FeaturePaused feature="music_dna" />
        {/* Skip through the same action, so the pointer moves on (J1 E8) without any pick being written. */}
        <form action={skipDnaAction}>
          <button type="submit" className="btn btn-primary btn-block">
            {t("skip")}
          </button>
        </form>
      </AuthScreen>
    );
  }
  const [suggestions, own] = await Promise.all([
    genreSuggestions(page.locale),
    ownMusicDna(page.userId!, page.locale),
  ]);
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <DnaPicker
        suggestions={suggestions}
        initial={own.genres}
        initialArtists={own.artists.flatMap((a) =>
          a.mbid ? [{ mbid: a.mbid, name: a.name, photoId: a.photoId }] : [],
        )}
      />
    </AuthScreen>
  );
}
