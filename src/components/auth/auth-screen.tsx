import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitch } from "@/components/locale-switch";
import { AlphaMark } from "@/components/shell/alpha-mark";
import { IconBack } from "@/components/ui/icons";

/**
 * The onboarding shell (D-079, D-080): on the phone a top bar with the wordmark and the screen below it; from
 * 600 px the top bar and the screen form one card centred in the window, as `pulse/` does for `data-kind="onb"`.
 * Step 5.4 adds the optional Back link in the bar and the "Korak N od M" progress under it (J1).
 */
export async function AuthScreen({
  title,
  children,
  icon,
  centered = false,
  back,
  progress,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  centered?: boolean;
  /** A step before this one (J1: Back is always available and keeps earlier answers). */
  back?: string;
  progress?: { n: number; total: number };
}) {
  const t = await getTranslations("app");
  const tj = await getTranslations("join");
  return (
    <div className="onb-shell">
      <div className="onb-card">
        <header className="topbar">
          {back ? (
            <Link href={back} className="iconbtn" aria-label={t("back")}>
              <IconBack />
            </Link>
          ) : null}
          <div className="topbar-title">
            <Link href="/" className="no-underline" aria-label="GrooveRift">
              <Wordmark />
            </Link>
            <AlphaMark />
          </div>
          <LocaleSwitch />
        </header>
        <main id="main" tabIndex={-1} className="screen-onb">
          {progress ? (
            <div className="progress">
              <p className="progress-text">{tj("progress", progress)}</p>
              <div className="pulse-progress" aria-hidden="true">
                {Array.from({ length: progress.total }, (_, j) => (
                  <i
                    key={j}
                    className={j < progress.n - 1 ? "done" : j === progress.n - 1 ? "now" : ""}
                    style={{ "--i": j, "--n": progress.total } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {centered ? (
            <div className="center-block">
              {icon ? (
                <span className="step-ic" aria-hidden="true">
                  {icon}
                </span>
              ) : null}
              <h1 tabIndex={-1}>{title}</h1>
            </div>
          ) : (
            <h1 tabIndex={-1}>{title}</h1>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
