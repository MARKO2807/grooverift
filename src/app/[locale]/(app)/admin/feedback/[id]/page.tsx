import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { FeedbackTriage } from "@/components/admin/feedback";
import { feedbackDetail } from "@/lib/data/feedback";

export const dynamic = "force-dynamic";

// i18n-keys: admin.feedback.kind.bug admin.feedback.kind.idea admin.feedback.kind.other
// i18n-keys: admin.feedback.status.new admin.feedback.status.done
// i18n-keys: account.feedback.ctx.screen account.feedback.ctx.version account.feedback.ctx.device
// i18n-keys: account.feedback.ctx.time

const CONTEXT_KEYS = ["screen", "version", "device", "time"] as const;

/** ADM-15 detail: the message, the details the member chose to send, the reply address only if they asked. */
export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const gate = await adminPageGate(locale, `/admin/feedback/${id}`, "admin");
  if (!gate.ok) return gate.element;
  const item = await feedbackDetail(id);
  if (!item) notFound();
  const t = await getTranslations("admin.feedback");
  const tc = await getTranslations("account.feedback.ctx");
  const f = await getFormatter();
  const ctx = CONTEXT_KEYS.filter((k) => item.context[k]).map(
    (k) => [k, item.context[k]!] as const,
  );
  return (
    <section className="form-stack" aria-labelledby="h-fbd">
      <Link href="/admin/feedback" className="link">
        {t("back")}
      </Link>
      <h2 id="h-fbd" className="set-t">
        {t(`kind.${item.kind}`)} · {t(`status.${item.status}`)}
      </h2>
      <p className="meta">
        {item.username ? `@${item.username}` : t("gone")} ·{" "}
        {f.dateTime(item.createdAt, {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        · {item.locale.toUpperCase()}
      </p>
      <p className="fb-text">{item.text}</p>
      {ctx.length ? (
        <ul className="sub-facts">
          {ctx.map(([k, v]) => (
            <li key={k}>
              {tc(k)}: {v}
            </li>
          ))}
        </ul>
      ) : (
        <p className="meta">{t("noDetails")}</p>
      )}
      <p className="meta">{item.replyTo ? t("replyTo", { email: item.replyTo }) : t("noReply")}</p>
      <FeedbackTriage id={item.id} notes={item.notes} done={item.status === "done"} />
    </section>
  );
}
