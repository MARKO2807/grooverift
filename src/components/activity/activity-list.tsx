"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/profile/avatar";
import { When } from "@/components/drop/when";
import { Wave } from "@/components/drop/reaction-button";
import { IconCalendar, IconShield } from "@/components/ui/icons";
import { markActivityReadAction } from "@/lib/activity/actions";

type Person = { username: string; displayName: string };

/** The client shape of an Activity entry (ISO times; only what a row shows). */
export type ActivityRow =
  | {
      kind: "comment";
      id: string;
      at: string;
      unread: boolean;
      actor: Person;
      excerpt: string;
      href: string;
    }
  | {
      kind: "reaction";
      id: string;
      at: string;
      unread: boolean;
      actors: Person[];
      others: number;
      href: string;
    }
  | { kind: "follow" | "follow_accept"; id: string; at: string; unread: boolean; actor: Person }
  | { kind: "drop"; id: string; at: string; unread: false; question: string; href: string }
  | {
      kind: "moderation" | "appeal" | "report_update";
      id: string;
      at: string;
      unread: boolean;
      detail: string;
      href: string;
    };

type Group = "today" | "week" | "earlier";
// i18n-keys: activity.group.today activity.group.week activity.group.earlier
// i18n-keys: activity.moderation activity.appeal.upheld activity.appeal.overturned
// i18n-keys: activity.report.action activity.report.none

/** Danas / Ovaj tjedan / Ranije (D-068 (4)) by the member's own calendar day; the server groups by UTC day. */
function groupOf(at: string, now: Date, local: boolean): Group {
  const d = new Date(at);
  const day = (x: Date) =>
    local
      ? new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
      : Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  return diff <= 0 ? "today" : diff < 7 ? "week" : "earlier";
}

const b = (chunks: React.ReactNode) => <b>{chunks}</b>;

/**
 * ACT-01 (D-068 (4)): one list grouped by day, unread entries with a soft tint (and ", novo" for screen readers),
 * each entry one link to where it happened (re-authorized there, JR1). Entries are seen once the list is on
 * screen; the tint stays for this visit and is gone on the next.
 */
export function ActivityList({ rows, upTo }: { rows: ActivityRow[]; upTo: string | null }) {
  const t = useTranslations("activity");
  const local = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (upTo) void markActivityReadAction(upTo);
  }, [upTo]);

  const now = new Date();
  const groups: { key: Group; rows: ActivityRow[] }[] = [];
  for (const r of rows) {
    const key = groupOf(r.at, now, local);
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, rows: [] }));
    g.rows.push(r);
  }

  const text = (r: ActivityRow) => {
    switch (r.kind) {
      case "comment":
        return t.rich("comment", { name: r.actor.displayName, excerpt: r.excerpt, b });
      case "reaction": {
        const [a, c] = r.actors;
        if (!c) return t.rich("reactionOne", { a: a!.displayName, b });
        if (!r.others) return t.rich("reactionTwo", { a: a!.displayName, c: c.displayName, b });
        return t.rich("reactionMany", { a: a!.displayName, c: c.displayName, n: r.others, b });
      }
      case "follow":
        return t.rich("follow", { name: r.actor.displayName, b });
      case "follow_accept":
        return t.rich("followAccept", { name: r.actor.displayName, b });
      case "drop":
        return t.rich("drop", { question: r.question, b });
      case "moderation":
        return t.rich("moderation", { b });
      case "appeal":
        return t.rich(`appeal.${r.detail === "overturned" ? "overturned" : "upheld"}`, { b });
      case "report_update":
        return t.rich(`report.${r.detail === "action" ? "action" : "none"}`, { b });
    }
  };

  const lead = (r: ActivityRow) => {
    if (r.kind === "drop")
      return (
        <span className="act-ic" aria-hidden="true">
          <IconCalendar />
        </span>
      );
    if ("detail" in r)
      return (
        <span className="act-ic" aria-hidden="true">
          <IconShield />
        </span>
      );
    const who = r.kind === "reaction" ? r.actors[0]! : r.actor;
    return <Avatar name={who.displayName} size="sm" />;
  };

  const href = (r: ActivityRow) =>
    "href" in r
      ? r.href
      : r.kind === "follow" || r.kind === "follow_accept"
        ? `/@${r.actor.username}`
        : "/activity";

  return (
    <div className="act-groups">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`h-act-${g.key}`}>
          <h2 className="set-gt" id={`h-act-${g.key}`}>
            {t(`group.${g.key}`)}
          </h2>
          <ul className="act-list">
            {g.rows.map((r) => (
              <li key={r.id} className={`act${r.unread ? " act-new" : ""}`}>
                <Link href={href(r)} className="act-link">
                  {lead(r)}
                  <span className="act-body">
                    <span className="act-txt">
                      {text(r)}
                      {r.unread ? <span className="sr-only">{t("new")}</span> : null}
                    </span>
                    <span className="act-time">
                      <When at={r.at} />
                    </span>
                  </span>
                  {r.kind === "reaction" ? (
                    <span className="act-wave" aria-hidden="true">
                      <Wave />
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
