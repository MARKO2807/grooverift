import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitch } from "@/components/locale-switch";
import { AlphaMark } from "@/components/shell/alpha-mark";

/**
 * The onboarding shell (D-079, D-080): on the phone a top bar with the wordmark and the screen below it; from
 * 600 px the top bar and the screen form one card centred in the window, as `pulse/` does for `data-kind="onb"`.
 */
export async function AuthScreen({
  title,
  children,
  icon,
  centered = false,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className="onb-shell">
      <div className="onb-card">
        <header className="topbar">
          <div className="topbar-title">
            <Link href="/" className="no-underline" aria-label="GrooveRift">
              <Wordmark />
            </Link>
            <AlphaMark />
          </div>
          <LocaleSwitch />
        </header>
        <main id="main" tabIndex={-1} className="screen-onb">
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
