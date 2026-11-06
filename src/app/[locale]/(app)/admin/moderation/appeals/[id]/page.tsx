import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { AppealDecisionForm } from "@/components/admin/moderation";
import { Notice } from "@/components/ui/notice";
import { roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { appealDetail } from "@/lib/data/moderation";

export const dynamic = "force-dynamic";

// i18n-keys: moderation.kind.content_removal moderation.kind.notice moderation.kind.warning
// i18n-keys: moderation.kind.restriction moderation.kind.suspension moderation.kind.ban
// i18n-keys: moderation.appeal.upheld moderation.appeal.overturned

const WHEN = { day: "numeric", month: "short", year: "numeric" } as const;

/** ADM-11, one appeal: the decision, the member's text, the moderation copy (logged), and the outcome form. */
export default async function AppealPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const gate = await adminPageGate(locale, `/admin/moderation/appeals/${id}`, "moderator", "admin");
  if (!gate.ok) return gate.element;
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const t = await getTranslations("moderation");
  const ts = await getTranslations("safety");
  const f = await getFormatter();
  const a = await appealDetail(viewer, id);
  if (!a)
    return (
      <section className="form-stack">
        <Notice kind="warning">{t("case.forbidden")}</Notice>
        <Link href="/admin/moderation/appeals" className="btn btn-secondary btn-sm">
          {t("case.back")}
        </Link>
      </section>
    );
  return (
    <section className="form-stack mod-case" aria-labelledby="h-ap">
      <Link href="/admin/moderation/appeals" className="link">
        {t("case.back")}
      </Link>
      <h2 id="h-ap" className="set-t">
        {t("appeal.one", { kind: t(`kind.${a.action.kind}`) })}
      </h2>
      {a.ownDecision ? <Notice kind="warning">{t("appeal.ownWarn")}</Notice> : null}
      {a.conflict === "involved" ? <Notice kind="warning">{t("appeal.involved")}</Notice> : null}
      {a.subject ? (
        <p>
          <b>{a.subject.displayName}</b>
          {a.subject.username ? ` @${a.subject.username}` : ""}
        </p>
      ) : null}
      <section className="section" aria-labelledby="h-orig">
        <h3 id="h-orig" className="set-gt">
          {t("appeal.decision")}
        </h3>
        <div className="sor-item">
          <span className="set-d">
            {t(`kind.${a.action.kind}`)}
            {a.action.rule ? ` · ${ts(`rule.${a.action.rule as "respect"}`)}` : ""} ·{" "}
            {f.dateTime(a.action.createdAt, WHEN)}
          </span>
          <span>{a.action.statement}</span>
        </div>
        {a.snapshots.map((s, i) => (
          <blockquote key={i} className="sor-item">
            <span className="set-d">{t("case.copy")}</span>
            <span>
              {typeof s.content.body === "string"
                ? s.content.body
                : [s.content.displayName, s.content.bio].filter(Boolean).join(" · ")}
            </span>
          </blockquote>
        ))}
      </section>
      <section className="section" aria-labelledby="h-text">
        <h3 id="h-text" className="set-gt">
          {t("appeal.memberText", { date: f.dateTime(a.createdAt, WHEN) })}
        </h3>
        <p className="mod-details">{a.text}</p>
      </section>
      {a.status === "open" ? (
        <section className="section" aria-labelledby="h-out">
          <h3 id="h-out" className="set-gt">
            {t("appeal.decide")}
          </h3>
          <AppealDecisionForm appealId={a.id} involved={a.conflict === "involved"} />
        </section>
      ) : (
        <section className="section" aria-labelledby="h-out">
          <h3 id="h-out" className="set-gt">
            {t(`appeal.${a.status}`)}
          </h3>
          {a.outcomeText ? <p>{a.outcomeText}</p> : null}
        </section>
      )}
    </section>
  );
}
