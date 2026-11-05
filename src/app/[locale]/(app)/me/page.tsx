import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Spirala } from "@/components/motifs/spirala";
import { BuildingPlaceholder, FeaturePaused } from "@/components/system/states";
import { IconGear } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { flagState } from "@/lib/flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("profile") };
}

/**
 * The Profile tab (PROF-01 for the member's own profile). Step 5.5 builds the profile and moves it to
 * `/@<username>`; step 5.3 fills the Spirala from the member's Music DNA. Until then the Spirala shows its empty
 * state (a flat line, the real state of a member without genres) and the music_dna flag can pause it (SYS-04).
 * Settings open from the gear at the top right (D-063 (9)).
 */
export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/me");
  const t = await getTranslations("nav");
  const tp = await getTranslations("placeholder");
  const paused = (await flagState("music_dna")) === "paused";
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
        <Spirala genres={[]} caption="Music DNA" height={160} />
      )}
      <BuildingPlaceholder text={tp("profile")} />
    </AppShell>
  );
}
