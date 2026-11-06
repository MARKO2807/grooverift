import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { TakeCase } from "@/components/admin/moderation";
import { ModerationTabs } from "@/components/admin/moderation-tabs";
import { roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { moderationCounts, moderationQueue } from "@/lib/data/moderation";

export const dynamic = "force-dynamic";

// i18n-keys: moderation.priority.0 moderation.priority.1 moderation.priority.2
// i18n-keys: moderation.target.profile moderation.target.answer moderation.target.comment moderation.target.notice
// i18n-keys: safety.cat.harassment.name safety.cat.hate.name safety.cat.threat.name safety.cat.sexual.name
// i18n-keys: safety.cat.minor.name safety.cat.impersonation.name safety.cat.spam.name safety.cat.copyright.name
// i18n-keys: safety.cat.ai_generated.name safety.cat.private_info.name safety.cat.other.name
// i18n-keys: notice.categories.csam notice.categories.hate notice.categories.threat notice.categories.privacy
// i18n-keys: notice.categories.copyright notice.categories.fraud notice.categories.other
// i18n-keys: moderation.outcome.action moderation.outcome.none
// i18n-keys: moderation.queue.assignee.me moderation.queue.assignee.other moderation.queue.conflict.self
// i18n-keys: moderation.queue.conflict.involved

/**
 * ADM-10, the queue: open cases by priority (threats, minors, impersonation first) and age, or the latest decided
 * ones. Rows carry no content and no names; the case page shows the evidence and logs the view.
 */
export default async function ModerationQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale } = await params;
  const closed = (await searchParams).view === "closed";
  const gate = await adminPageGate(locale, "/admin/moderation", "moderator", "admin");
  if (!gate.ok) return gate.element;
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const [items, counts] = await Promise.all([
    moderationQueue(viewer, closed ? "closed" : "open"),
    moderationCounts(viewer.id ?? undefined),
  ]);
  const t = await getTranslations("moderation");
  const ts = await getTranslations("safety");
  const tn = await getTranslations("notice");
  const f = await getFormatter();
  return (
    <section className="form-stack" aria-labelledby="h-mod">
      <h2 id="h-mod" className="set-t">
        {t("title")}
      </h2>
      <ModerationTabs current={closed ? "closed" : "open"} counts={counts} />
      {!items?.length ? (
        <p className="set-empty">{closed ? t("queue.emptyClosed") : t("queue.empty")}</p>
      ) : (
        <ul className="mod-list">
          {items.map((c) => (
            <li key={c.id} className={`mod-row prio-${c.priority}`}>
              <div className="mod-main">
                <p className="set-t">
                  <span className={`mod-prio prio-${c.priority}`}>
                    {t(`priority.${c.priority}`)}
                  </span>{" "}
                  {t(`target.${c.targetType}`)}
                </p>
                <p className="set-d">
                  {[
                    ...c.categories.map((x) => ts(`cat.${x}.name`)),
                    ...c.noticeCategories.map((x) => `${t("dsa")} · ${tn(`categories.${x}`)}`),
                  ].join(", ")}
                </p>
                <p className="meta">
                  {t("queue.meta", {
                    reports: c.reports,
                    date: f.dateTime(c.createdAt, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })}
                  {c.assignee ? ` · ${t(`queue.assignee.${c.assignee}`)}` : ""}
                  {c.outcome ? ` · ${t(`outcome.${c.outcome}`)}` : ""}
                </p>
                {c.conflict ? (
                  <p className="meta mod-conflict">{t(`queue.conflict.${c.conflict}`)}</p>
                ) : null}
              </div>
              <div className="mod-act">
                {c.canOpen ? (
                  <Link
                    href={`/admin/moderation/cases/${c.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    {t("queue.open")}
                  </Link>
                ) : null}
                {c.canTake ? <TakeCase caseId={c.id} label={t("queue.take")} /> : null}
                {!c.canOpen && !c.canTake ? <span className="meta">{t("queue.other")}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
