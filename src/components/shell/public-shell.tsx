import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitch } from "@/components/locale-switch";
import { AlphaMark } from "./alpha-mark";
import { LegalLinks } from "./legal-links";

/**
 * The visitor shell (pulse `data-kind="pub"`, D-076, D-085): the wordmark, the alpha mark and the language
 * button in the top bar; "Prijavi se" in a sticky foot on the phone (D-076 (2) B) and in the top bar from
 * 600 px. Legal links and the DSA notice link close every page (PUB-10, PUB-11). Signed-in members see
 * "Na početnu" instead of the sign-in.
 */
export async function PublicShell({
  children,
  screen,
  signedIn = false,
  legal = true,
}: {
  children: React.ReactNode;
  screen?: string;
  signedIn?: boolean;
  legal?: boolean;
}) {
  const t = await getTranslations("app");
  const action = signedIn
    ? { href: "/home", label: t("toApp") }
    : { href: "/sign-in", label: t("signIn") };
  return (
    <div className="shell" data-kind="pub">
      <div className="page">
        <header className="topbar">
          <Link href="/" className="wm-link" aria-label="GrooveRift">
            <Wordmark />
          </Link>
          <div className="top-right">
            <AlphaMark />
            <Link href={action.href} className="btn btn-secondary btn-sm top-signin-desk">
              {action.label}
            </Link>
            <LocaleSwitch />
          </div>
        </header>
        <main id="main" tabIndex={-1} className={`screen${screen ? ` screen-${screen}` : ""}`}>
          {children}
          {legal ? <LegalLinks /> : null}
        </main>
        <footer className="foot">
          <Link href={action.href} className="btn btn-primary btn-block">
            {action.label}
          </Link>
        </footer>
      </div>
    </div>
  );
}
