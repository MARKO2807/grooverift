import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { IconBell, IconGear, IconHelp, IconHome, IconHub, IconUser } from "@/components/ui/icons";
import { AlphaMark } from "./alpha-mark";

// i18n-keys: nav.home nav.hub nav.activity nav.profile nav.settings nav.help
/** The four main destinations in fixed order (D-031). Discover and Messages join later at fixed positions. */
export const TABS = [
  { id: "home", href: "/home", Icon: IconHome },
  { id: "hub", href: "/hub", Icon: IconHub },
  { id: "activity", href: "/activity", Icon: IconBell },
  { id: "profile", href: "/me", Icon: IconUser },
] as const;
export type TabId = (typeof TABS)[number]["id"];
/** Where a screen sits: a tab, or Settings and Help, which the rail names and the tab bar files under Profile. */
export type NavId = TabId | "settings" | "help";

export const tabOf = (nav: NavId | undefined): TabId | undefined =>
  nav === "settings" || nav === "help" ? "profile" : nav;

/**
 * The unread mark on Activity (D-104): a small count on the icon (9+ above nine), hidden from assistive technology,
 * which hears ", N novih stavki" after the label instead (the name still starts with the visible text).
 */
function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="nav-badge" aria-hidden="true">
      {n > 9 ? "9+" : n}
    </span>
  );
}

/** The spoken half of the badge, placed after the label so the link's name starts with the visible text. */
async function UnreadText({ n }: { n: number }) {
  if (n <= 0) return null;
  const t = await getTranslations("nav");
  return <span className="sr-only">{t("unread", { n })}</span>;
}

/** Phone tab bar (components §4.7): icon and caption, the current tab marked with a bar and aria-current. */
export async function TabBar({ nav, badge = 0 }: { nav?: NavId; badge?: number }) {
  const t = await getTranslations("nav");
  const ta = await getTranslations("app");
  const current = tabOf(nav);
  return (
    <nav aria-label={ta("mainNav")}>
      <ul className="tabbar">
        {TABS.map(({ id, href, Icon }) => (
          <li key={id}>
            <Link
              href={href}
              className="tab"
              aria-current={current === id ? "page" : undefined}
              data-tab={id}
            >
              <span className="nav-ic">
                <Icon />
                {id === "activity" ? <Badge n={badge} /> : null}
              </span>
              <span>{t(id)}</span>
              {id === "activity" ? <UnreadText n={badge} /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The rail from 600 px (D-079, D-080): the same four destinations in the same order (WCAG 3.2.3), then
 *  Settings, Help and the alpha mark. CSS shows only one of the rail and the tab bar, so a screen reader
 *  hears one main navigation. */
export async function Rail({ nav, badge = 0 }: { nav?: NavId; badge?: number }) {
  const t = await getTranslations("nav");
  const ta = await getTranslations("app");
  const item = (id: NavId, href: string, Icon: React.ComponentType) => (
    <li key={id}>
      <Link href={href} className="rail-item" aria-current={nav === id ? "page" : undefined}>
        <span className="nav-ic">
          <Icon />
          {id === "activity" ? <Badge n={badge} /> : null}
        </span>
        <span>{t(id)}</span>
        {id === "activity" ? <UnreadText n={badge} /> : null}
      </Link>
    </li>
  );
  return (
    <nav className="rail" aria-label={ta("mainNav")}>
      <span className="rail-brand">
        <Wordmark />
      </span>
      <ul className="rail-list">{TABS.map(({ id, href, Icon }) => item(id, href, Icon))}</ul>
      <div className="rail-foot">
        <ul className="rail-list">
          {item("settings", "/settings", IconGear)}
          {item("help", "/settings/help", IconHelp)}
        </ul>
        <AlphaMark />
      </div>
    </nav>
  );
}
