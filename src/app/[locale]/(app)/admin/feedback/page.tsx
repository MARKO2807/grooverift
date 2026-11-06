import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { feedbackQueue } from "@/lib/data/feedback";

export const dynamic = "force-dynamic";

// i18n-keys: admin.feedback.kind.bug admin.feedback.kind.idea admin.feedback.kind.other
// i18n-keys: admin.feedback.status.new admin.feedback.status.done

/** ADM-15 (IA, Master Prompt §13): alpha feedback and bug reports, the open ones first. Admins only. */
export default async function FeedbackListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale } = await params;
  const all = (await searchParams).view === "all";
  const gate = await adminPageGate(locale, "/admin/feedback", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.feedback");
  const f = await getFormatter();
  const items = await feedbackQueue(all ? "all" : "new");
  return (
    <section className="form-stack" aria-labelledby="h-fb">
      <h2 id="h-fb" className="set-t">
        {t("title")}
      </h2>
      <nav className="foot-row" aria-label={t("viewLabel")}>
        <Link
          href="/admin/feedback"
          className="btn btn-secondary btn-sm"
          aria-current={all ? undefined : "page"}
        >
          {t("open")}
        </Link>
        <Link
          href="/admin/feedback?view=all"
          className="btn btn-secondary btn-sm"
          aria-current={all ? "page" : undefined}
        >
          {t("all")}
        </Link>
      </nav>
      {!items.length ? (
        <p className="set-empty">{all ? t("emptyAll") : t("empty")}</p>
      ) : (
        <ul className="fb-list">
          {items.map((x) => (
            <li key={x.id}>
              <Link href={`/admin/feedback/${x.id}`} className="fb-row">
                <span className="set-t">
                  {t(`kind.${x.kind}`)} · {t(`status.${x.status}`)}
                </span>
                <span className="set-d">{x.excerpt}</span>
                <span className="meta">
                  {x.username ? `@${x.username}` : t("gone")} ·{" "}
                  {f.dateTime(x.createdAt, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
