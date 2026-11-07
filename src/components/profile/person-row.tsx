import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Person } from "@/lib/data/profiles";
import { Avatar } from "./avatar";
import { RelationshipButton } from "./relationship";
import { RemoveFollowerMenu } from "./row-actions";

/**
 * One person in a list, a request or a search result (PROF-07, D-074 (6)): the name opens the profile, the right
 * side acts. `right` overrides the default relationship button (requests, the own followers list).
 */
export async function PersonRow({
  person,
  right,
  removable = false,
}: {
  person: Person;
  right?: React.ReactNode;
  /** The own private followers list: ⋯ with "Remove follower" (D-069, D-074 (7)). */
  removable?: boolean;
}) {
  const t = await getTranslations("profile.lists");
  const action = person.self ? null : removable ? (
    <RemoveFollowerMenu
      followerId={person.id}
      username={person.username}
      displayName={person.displayName}
    />
  ) : (
    (right ?? (
      <RelationshipButton
        targetId={person.id}
        username={person.username}
        targetPrivate={person.targetPrivate}
        initial={person.relation.follows}
        followedBy={person.relation.followedBy}
        size="sm"
      />
    ))
  );
  return (
    <li className="fl-row">
      <Link href={`/@${person.username}`} className="fl-person">
        <Avatar name={person.displayName} size="sm" photo={person.photoId} />
        <span className="set-txt">
          <span className="set-t">{person.displayName}</span>
          <span className="set-d">
            @{person.username}
            {person.self ? ` · ${t("you")}` : ""}
          </span>
        </span>
      </Link>
      {action}
    </li>
  );
}
