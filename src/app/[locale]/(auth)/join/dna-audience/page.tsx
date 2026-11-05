import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DnaAudienceForm } from "@/components/onboarding/dna-audience-form";
import { Spirala } from "@/components/motifs/spirala";
import { ownMusicDna } from "@/lib/data/music-dna";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.dnaAudience");
  return { title: t("title") };
}

/** ONB-06 (J1 step 8, D-034): shown only after at least one pick; nothing pre-selected until the member chooses. */
export default async function DnaAudiencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "dnaAudience");
  const t = await getTranslations("join.dnaAudience");
  const ts = await getTranslations("spirala");
  const own = await ownMusicDna(page.userId!, page.locale);
  // "me" is the fail-closed default written at the username step, not a choice the member made (D-034).
  const chosen =
    page.state?.step !== "dnaAudience" && page.state?.dnaAudience !== "mutuals"
      ? (page.state?.dnaAudience ?? null)
      : null;
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <div className="dna-live">
        <Spirala
          genres={own.genres.map((g) => ({ name: g.name, traitKey: g.traitKey, key: g.slug }))}
          caption={ts("listLabel")}
          height={116}
          captionHidden
          intro={false}
        />
      </div>
      <DnaAudienceForm initial={chosen} />
    </AuthScreen>
  );
}
