import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicShell } from "@/components/shell/public-shell";
import { RetryButton } from "@/components/system/retry-button";
import { IconOffline } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("system");
  return { title: t("offlineTitle") };
}

/** SYS-03: the page the service worker (step 5.12) serves when a page is not cached and the network is
 *  down. It needs no session or data, so it can be cached as it is. */
export default async function OfflinePage() {
  const t = await getTranslations("system");
  return (
    <PublicShell screen="offline" legal={false}>
      <div className="sys-na">
        <span className="step-ic" aria-hidden="true">
          <IconOffline />
        </span>
        <h1 tabIndex={-1}>{t("offlineTitle")}</h1>
        <p className="lead">{t("offlineText")}</p>
        <RetryButton label={t("retry")} />
      </div>
    </PublicShell>
  );
}
