"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { RetryButton } from "@/components/system/retry-button";
import { IconWarningCircle } from "@/components/ui/icons";

/**
 * SYS-02, the whole page failed (pulse FAIL_AT b): one calm block, Retry first, a way to tell us second. No
 * technical details, ids or digests that could reveal data (IA §2.12). The error itself goes to the server log
 * (and to error tracking once A7 exists).
 */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("system");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="bare-shell">
      <header className="topbar">
        <Link href="/" className="wm-link" aria-label="GrooveRift">
          <Wordmark />
        </Link>
      </header>
      <main id="main" tabIndex={-1} className="screen">
        <div className="sys-na">
          <span className="step-ic" aria-hidden="true">
            <IconWarningCircle />
          </span>
          <h1 tabIndex={-1}>{t("errorTitle")}</h1>
          <p className="lead">{t("errorText")}</p>
          <RetryButton label={t("retry")} onRetry={reset} />
          <p className="meta">
            {t("errorHelp")} <Link href="/about/alpha#feedback">{t("errorHelpLink")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
