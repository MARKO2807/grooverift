import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Spirala } from "@/components/motifs/spirala";
import { BuildingPlaceholder, FeaturePaused } from "@/components/system/states";
import { IconGear, IconPencil } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { ownMusicDna } from "@/lib/data/music-dna";
import { flagState } from "@/lib/flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("profile") };
}

/**
 * The Profile tab (PROF-01 for the member's own profile). Step 5.5 builds the profile and moves it to
 * `/@<username>`. The Spirala is drawn from the member's own Music DNA (step 5.3a) and opens the editor (PROF-09);
 * the music_dna flag can pause it (SYS-04).
 * Settings open from the gear at the top right (D-063 (9)).
 */
export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/me");
  const t = await getTranslations("nav");
  const tp = await getTranslations("placeholder");
  const td = await getTranslations("dna");
  const paused = (await flagState("music_dna")) === "paused";
  const dna = paused ? null : await ownMusicDna(session.user.id, locale === "en" ? "en" : "hr");
  return (
    <AppShell
      title={t("profile")}
      nav="profile"
      screen="profile"
      actions={
        <Link href="/settings" className="iconbtn" aria-label={t("settings")}>
          <IconGear />
        </Link>
      }
    >
      <p className="lead">{session.user.name}</p>
      {paused ? (
        <FeaturePaused feature="music_dna" />
      ) : (
        <section className="me-dna" aria-labelledby="h-me-dna">
          <h2 id="h-me-dna" className="set-gt">
            {td("title")}
          </h2>
          {dna?.genres.length ? (
            <Spirala
              genres={dna.genres.map((g) => ({ name: g.name, traitKey: g.traitKey, key: g.slug }))}
              caption={td("summary", { genres: dna.genres.length, artists: dna.artists.length })}
              height={160}
            />
          ) : (
            <p className="set-empty">{td("emptyOwn")}</p>
          )}
          <Link href="/me/dna" className="btn btn-secondary btn-sm me-dna-edit">
            <IconPencil />
            {td("edit")}
          </Link>
        </section>
      )}
      <BuildingPlaceholder text={tp("profile")} />
    </AppShell>
  );
}
