import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { DnaEditor } from "@/components/dna/dna-editor";
import { FeaturePaused } from "@/components/system/states";
import { memberPage } from "@/lib/auth/member-page";
import { dnaAudience, genreSuggestions, ownMusicDna } from "@/lib/data/music-dna";
import { flagState } from "@/lib/flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dna");
  return { title: t("edit") };
}

/**
 * PROF-09, the Music DNA editor (J2, D-078), at /me/dna. The member's own entries only: the id comes from the
 * session. While the music_dna flag is paused the editor is replaced by SYS-04 and the actions refuse as well.
 */
export default async function DnaEditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/me/dna");
  const t = await getTranslations("dna");
  const lang = locale === "en" ? "en" : "hr";
  if ((await flagState("music_dna")) === "paused") {
    return (
      <AppShell title={t("edit")} backHref="/me" nav="profile" screen="narrow">
        <FeaturePaused feature="music_dna" />
      </AppShell>
    );
  }
  const [dna, audience, suggestions] = await Promise.all([
    ownMusicDna(session.user.id, lang),
    dnaAudience(session.user.id),
    genreSuggestions(lang),
  ]);
  return (
    <AppShell title={t("edit")} backHref="/me" nav="profile" screen="narrow">
      <DnaEditor initial={dna} audience={audience} suggestions={suggestions} />
    </AppShell>
  );
}
