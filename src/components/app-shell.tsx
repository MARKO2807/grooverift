import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { AlphaMark } from "@/components/shell/alpha-mark";
import { Rail, TabBar, TABS, tabOf, type NavId } from "@/components/shell/nav";
import { BackLink } from "@/components/shell/back-link";
import { SwipeTabs } from "@/components/shell/swipe-tabs";
import { IconBack } from "@/components/ui/icons";
import { getSession } from "@/lib/auth/session";
import { activityBadgeCount } from "@/lib/data/notifications";

/** D-104: the Activity badge for the signed-in member; none on Activity itself, and never an error for the page. */
async function badgeFor(nav: NavId | undefined): Promise<number> {
  if (nav === "activity") return 0;
  try {
    const session = await getSession();
    return session ? await activityBadgeCount(session.user.id) : 0;
  } catch {
    return 0;
  }
}

/**
 * The signed-in shell (components §4.7, D-079, D-080; pulse `data-kind="app"`): on the phone a top bar, the
 * screen and the glass tab bar; from 600 px the rail beside one centred column, from 1024 px the rail with
 * labels and the wordmark. Two top-bar variants:
 *  - `home`: the wordmark in the bar (phone), no bar from 1024 px; the h1 is visually hidden in the screen.
 *  - default: optional back, the screen's h1 as the bar title; `actions` sit on the right.
 * Navigation focuses the page's h1 (FocusOnNavigate), wherever it sits.
 */
export async function AppShell({
  title,
  backHref,
  backHistory = false,
  nav,
  home = false,
  bodyHeading = false,
  actions,
  screen,
  dock,
  children,
}: {
  title: string;
  backHref?: string;
  /** Back returns to the previous page of the app; `backHref` is the fallback (BackLink, D-098 (1)). */
  backHistory?: boolean;
  nav?: NavId;
  home?: boolean;
  /** The body renders its own h1 (system pages): the bar shows the wordmark and no title. */
  bodyHeading?: boolean;
  actions?: React.ReactNode;
  /** Adds `screen-<name>` to main for screen-specific layout. */
  screen?: string;
  /** The answer dock (HUB-02): above the tab bar on the phone, at the foot of the column from 600 px. */
  dock?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = await getTranslations("app");
  const tab = tabOf(nav);
  const tabIndex = tab ? TABS.findIndex((x) => x.id === tab) : -1;
  const badge = await badgeFor(nav);
  return (
    <div className="shell" data-kind="app">
      <Rail nav={nav} badge={badge} />
      <div className="page">
        <header className={`topbar${home ? " topbar-home" : ""}`}>
          {backHref && backHistory ? (
            <BackLink fallback={backHref} label={t("back")} />
          ) : backHref ? (
            <Link href={backHref} className="iconbtn" aria-label={t("back")}>
              <IconBack />
            </Link>
          ) : null}
          {home || bodyHeading ? (
            <Link href="/home" className="wm-link" aria-label="GrooveRift">
              <Wordmark />
            </Link>
          ) : (
            <h1 className="top-title" tabIndex={-1}>
              {title}
            </h1>
          )}
          <div className="top-right">
            {actions}
            <AlphaMark />
          </div>
        </header>
        <main id="main" tabIndex={-1} className={`screen${screen ? ` screen-${screen}` : ""}`}>
          {home && !bodyHeading ? (
            <h1 className="sr-only" tabIndex={-1}>
              {title}
            </h1>
          ) : null}
          {children}
        </main>
        <div className={`bottom${dock ? " has-dock" : ""}`}>
          {dock}
          <TabBar nav={nav} badge={badge} />
        </div>
      </div>
      {tabIndex >= 0 && (nav === tab || nav === undefined) ? (
        <SwipeTabs current={tabIndex} />
      ) : null}
    </div>
  );
}
