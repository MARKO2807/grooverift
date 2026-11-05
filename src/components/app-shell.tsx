import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitch } from "@/components/locale-switch";

/** Minimal signed-in shell for the foundation (the rail and tabs arrive with Phase 5). */
export async function AppShell({
  title,
  backHref,
  children,
}: {
  title: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("app");
  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          {backHref ? (
            <Link href={backHref} className="btn btn-secondary btn-sm">
              {t("back")}
            </Link>
          ) : null}
          <Link href="/home" className="no-underline" aria-label="GrooveRift">
            <Wordmark />
          </Link>
        </div>
        <LocaleSwitch />
      </header>
      <main id="main" tabIndex={-1} className="screen-onb">
        <h1 tabIndex={-1}>{title}</h1>
        {children}
      </main>
    </>
  );
}
