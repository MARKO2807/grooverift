import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconPause, IconWarningCircle } from "@/components/ui/icons";

/** SYS-01 (IA8): one "nije dostupno" body for every reason: never existed, deleted, deactivated,
 *  suspended, private, blocked, unpublished. The same words, the same size, HTTP 404 (U-02, U-03). */
export async function NotAvailable({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations("system");
  return (
    <div className="sys-na">
      <h1 tabIndex={-1}>{t("naTitle")}</h1>
      <p className="lead">{t("naText")}</p>
      <Link href={signedIn ? "/home" : "/"} className="btn btn-secondary">
        {t("toHome")}
      </Link>
    </div>
  );
}

// i18n-keys: system.paused.music_dna.title system.paused.music_dna.text
// i18n-keys: system.paused.daily_drop.title system.paused.daily_drop.text
// i18n-keys: system.paused.comments.title system.paused.comments.text
export type PausableFeature = "music_dna" | "daily_drop" | "comments";

/** SYS-04: a feature switched off through its flag during an incident (state "paused"). Brief, no blame,
 *  the way out is named; content stays readable around it. */
export async function FeaturePaused({
  feature,
  headingLevel = 2,
  homeLink = false,
}: {
  feature: PausableFeature;
  headingLevel?: 1 | 2 | 3;
  homeLink?: boolean;
}) {
  const t = await getTranslations("system");
  const H = `h${headingLevel}` as const;
  return (
    <div className="paused-card" role="status">
      <IconPause />
      <div className="form-stack">
        <H className="set-t" tabIndex={headingLevel === 1 ? -1 : undefined}>
          {t(`paused.${feature}.title`)}
        </H>
        <p>
          {t(`paused.${feature}.text`)} {t("pausedSafe")}
        </p>
        {homeLink ? (
          <Link href="/home" className="btn btn-secondary btn-sm">
            {t("toHome")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** A screen that is still being built (step 5.1 placeholders for Hub, Activity, Profile, Help). Says so plainly;
 *  never fake content (Master Prompt §2A.4). */
export async function BuildingPlaceholder({ text }: { text: string }) {
  const t = await getTranslations("placeholder");
  return (
    <div className="empty-b">
      <IconWarningCircle />
      <p className="empty-t">{t("mark")}</p>
      <p>{text}</p>
    </div>
  );
}
