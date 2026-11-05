import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitch } from "@/components/locale-switch";

/** The onboarding shell: top bar with the wordmark, then a centred card from 600 px (D-079). */
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
  const t = await getTranslations("app");
  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          <Link href="/" className="no-underline" aria-label="GrooveRift">
            <Wordmark />
          </Link>
          <span className="pill">{t("alpha")}</span>
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
    </>
  );
}
