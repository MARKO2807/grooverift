import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { ModerationTabs } from "@/components/admin/moderation-tabs";
import { roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { appealQueue, moderationCounts } from "@/lib/data/moderation";

export const dynamic = "force-dynamic";

// i18n-keys: moderation.kind.content_removal moderation.kind.notice moderation.kind.warning
// i18n-keys: moderation.kind.restriction moderation.kind.suspension moderation.kind.ban

/** ADM-11: open appeals, oldest first. A reviewer other than the one who decided, where possible (D-075). */
export default async function AppealsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/moderation/appeals", "moderator", "admin");
  if (!gate.ok) return gate.element;
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const [items, counts] = await Promise.all([
    appealQueue(viewer),
    moderationCounts(viewer.id ?? undefined),
  ]);
  const t = await getTranslations("moderation");
  const f = await getFormatter();
  return (
    <section className="form-stack" aria-labelledby="h-app">
      <h2 id="h-app" className="set-t">
        {t("appeal.title")}
      </h2>
      <ModerationTabs current="appeals" counts={counts} />
      {!items?.length ? (
        <p className="set-empty">{t("appeal.empty")}</p>
      ) : (
        <ul className="mod-list">
          {items.map((a) => (
            <li key={a.id} className="mod-row">
              <div className="mod-main">
                <p className="set-t">{t(`kind.${a.kind}`)}</p>
                <p className="meta">
                  {t("appeal.meta", {
                    sent: f.dateTime(a.createdAt, { day: "numeric", month: "short" }),
                    decided: f.dateTime(a.decidedAt, { day: "numeric", month: "short" }),
                  })}
                </p>
                {a.ownDecision ? <p className="meta mod-conflict">{t("appeal.own")}</p> : null}
              </div>
              <div className="mod-act">
                {a.self || (a.ownDecision && viewer.role !== "admin") ? (
                  <span className="meta">{t("queue.other")}</span>
                ) : (
                  <Link
                    href={`/admin/moderation/appeals/${a.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    {t("queue.open")}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
