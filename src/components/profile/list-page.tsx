import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { IconUsers } from "@/components/ui/icons";
import { listMembers, type ListKind } from "@/lib/data/profiles";
import { notAvailable, profileViewer } from "@/lib/profile/page";
import { PersonRow } from "./person-row";

/**
 * PROF-07 (D-074 (6)): one screen with two tabs, "Followers N" and "Following N", for the lists the viewer may
 * see (D-033). Visitors never see lists (D-022), so a signed-out request answers "not available".
 */
export async function ListPage({
  locale,
  username,
  which,
}: {
  locale: string;
  username: string;
  which: ListKind;
}) {
  const path = `/@${username}/${which}`;
  const { viewer, session } = await profileViewer(locale, path);
  if (!session) notAvailable();
  const view = await listMembers(viewer, username, which);
  if (view.kind === "not-available") notAvailable();
  const t = await getTranslations("profile.lists");
  const base = `/@${view.username}`;
  const removable = view.self && view.ownerPrivate && which === "followers";
  const emptyTitle =
    which === "followers"
      ? t("emptyFollowers")
      : view.self
        ? t("emptyFollowingOwn")
        : t("emptyFollowing");
  const emptyText =
    which === "followers"
      ? view.self
        ? t("followersHint")
        : ""
      : view.self
        ? t("followingHint")
        : "";
  return (
    <AppShell
      title={view.self ? t("title") : view.displayName}
      backHref={base}
      nav={view.self ? "profile" : undefined}
      screen="narrow"
    >
      <nav className="sort fl-tabs" aria-label={t("tabs")}>
        <Link
          href={`${base}/followers`}
          className="sort-link"
          aria-current={which === "followers" ? "page" : undefined}
        >
          <span>
            {t("followers")}
            <b>{view.counts.followers}</b>
          </span>
        </Link>
        <Link
          href={`${base}/following`}
          className="sort-link"
          aria-current={which === "following" ? "page" : undefined}
        >
          <span>
            {t("following")}
            <b>{view.counts.following}</b>
          </span>
        </Link>
      </nav>
      {view.people.length ? (
        <ul
          className="fl-list"
          aria-label={which === "followers" ? t("followers") : t("following")}
        >
          {view.people.map((p) => (
            <PersonRow key={p.id} person={p} removable={removable} />
          ))}
        </ul>
      ) : (
        <div className="empty-b">
          <IconUsers />
          <p className="empty-t">{emptyTitle}</p>
          {emptyText ? <p>{emptyText}</p> : null}
        </div>
      )}
      {view.self && which === "followers" ? (
        <p className="set-note">{view.ownerPrivate ? t("noteOwnPrivate") : t("noteOwn")}</p>
      ) : null}
    </AppShell>
  );
}
