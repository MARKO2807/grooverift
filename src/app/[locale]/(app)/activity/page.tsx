import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { ActivityList, type ActivityRow } from "@/components/activity/activity-list";
import { IconBell, IconChevron, IconUserPlus } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { dropLocale } from "@/lib/drop/present";
import { pendingRequestCount } from "@/lib/data/graph";
import { activityFor, type ActivityItem } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("activity") };
}

const toRow = (i: ActivityItem): ActivityRow => ({ ...i, at: i.at.toISOString() }) as ActivityRow;

/**
 * ACT-01 (step 5.8, D-068 (4)): the follow-requests row on top while requests wait (ACT-02, D-074 (5)), then one
 * list grouped by day. Never cached (`/activity` is a private, no-store path, D-098 (2)); every entry is checked
 * again in `activityFor`, so content the member lost access to renders as nothing.
 */
export default async function ActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/activity");
  const t = await getTranslations("nav");
  const ta = await getTranslations("activity");
  const tr = await getTranslations("profile.requests");
  const [pending, items] = await Promise.all([
    pendingRequestCount(session.user.id),
    activityFor(session.user.id, dropLocale(locale)),
  ]);
  const newest = items.find((i) => i.kind !== "drop" && i.unread);
  return (
    <AppShell title={t("activity")} nav="activity" screen="activity">
      {pending ? (
        <ul className="set-list">
          <li>
            <Link href="/activity/requests" className="set-link req-entry">
              <IconUserPlus />
              <span className="set-txt">
                <span className="set-t">
                  {tr("title")}
                  <span className="req-n" aria-hidden="true">
                    {pending}
                  </span>
                </span>
                <span className="set-d">{tr("rowCount", { n: pending })}</span>
              </span>
              <IconChevron />
            </Link>
          </li>
        </ul>
      ) : null}
      {items.length ? (
        <ActivityList rows={items.map(toRow)} upTo={newest ? newest.at.toISOString() : null} />
      ) : (
        <div className="empty-b">
          <IconBell />
          <p className="empty-t">{ta("empty")}</p>
          <p>{ta("emptyText")}</p>
        </div>
      )}
    </AppShell>
  );
}
