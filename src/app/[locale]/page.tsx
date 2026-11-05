import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitch } from "@/components/locale-switch";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Landing placeholder (PUB-01 comes in Phase 5): the wordmark, one line and the sign-in button. */
export default async function LandingPage() {
  const t = await getTranslations("home");
  const session = await getSession();
  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          <Wordmark />
        </div>
        <LocaleSwitch />
      </header>
      <main id="main" tabIndex={-1} className="screen-onb">
        <h1>{t("title")}</h1>
        <p className="lead">{t("lead")}</p>
        <Link href={session ? "/home" : "/sign-in"} className="btn btn-primary btn-block">
          {t("signIn")}
        </Link>
      </main>
    </>
  );
}
