import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { adminPageGate } from "@/components/admin/gate";
import { DecisionForm, ReleaseCase, TakeCase } from "@/components/admin/moderation";
import { Notice } from "@/components/ui/notice";
import { roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { caseDetail } from "@/lib/data/moderation";
import { RULE_FOR_CATEGORY } from "@/lib/moderation/rules";

export const dynamic = "force-dynamic";

// i18n-keys: moderation.priority.0 moderation.priority.1 moderation.priority.2
// i18n-keys: moderation.target.profile moderation.target.answer moderation.target.comment moderation.target.notice
// i18n-keys: moderation.current.live moderation.current.deleted moderation.current.removed moderation.current.missing
// i18n-keys: moderation.state.open moderation.state.in_progress moderation.state.decided moderation.state.closed
// i18n-keys: moderation.kind.content_removal moderation.kind.notice moderation.kind.warning
// i18n-keys: moderation.kind.restriction moderation.kind.suspension moderation.kind.ban
// i18n-keys: moderation.outcome.action moderation.outcome.none moderation.case.conflict.involved
// i18n-keys: moderation.status.active moderation.status.suspended moderation.status.banned
// i18n-keys: moderation.status.deactivated moderation.status.pending_deletion moderation.status.deleted
// i18n-keys: notice.categories.csam notice.categories.hate notice.categories.threat notice.categories.privacy
// i18n-keys: notice.categories.copyright notice.categories.fraud notice.categories.other

const WHEN = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

/** The text of a moderation copy, whatever the object: an answer or comment body, or a profile's name and bio. */
function copyText(c: Record<string, unknown>): string[] {
  if (typeof c.body === "string") return [c.body];
  return [c.displayName, c.username ? `@${String(c.username)}` : "", c.bio].filter(
    (x): x is string => typeof x === "string" && !!x,
  );
}

/**
 * ADM-10, one case: the moderation copy as it was reported, the current state of the object, the reports (numbered,
 * never naming the reporter), DSA notices, earlier decisions about the member, and the decision form. Opening the
 * page writes evidence_access rows (data layer).
 */
export default async function CasePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const gate = await adminPageGate(locale, `/admin/moderation/cases/${id}`, "moderator", "admin");
  if (!gate.ok) return gate.element;
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const t = await getTranslations("moderation");
  const ts = await getTranslations("safety");
  const tn = await getTranslations("notice");
  const f = await getFormatter();
  const c = await caseDetail(viewer, id);
  if (!c)
    return (
      <section className="form-stack">
        <Notice kind="warning">{t("case.forbidden")}</Notice>
        <Link href="/admin/moderation" className="btn btn-secondary btn-sm">
          {t("case.back")}
        </Link>
      </section>
    );
  const open = c.state === "open" || c.state === "in_progress";
  const mine = c.assignee === "me";
  const canDecide = open && c.conflict !== "self" && (viewer.role === "admin" || mine);
  const firstCat = c.reports[0]?.category;
  const content = c.targetType === "answer" || c.targetType === "comment";
  return (
    <section className="form-stack mod-case" aria-labelledby="h-case">
      <Link href="/admin/moderation" className="link">
        {t("case.back")}
      </Link>
      <h2 id="h-case" className="set-t">
        <span className={`mod-prio prio-${c.priority}`}>{t(`priority.${c.priority}`)}</span>{" "}
        {t(`target.${c.targetType}`)} · {t(`state.${c.state}`)}
      </h2>
      <p className="meta">
        {t("case.opened", { date: f.dateTime(c.createdAt, WHEN) })} · {t("case.logged")}
      </p>
      {c.conflict === "involved" ? (
        <Notice kind="warning">{t("case.conflict.involved")}</Notice>
      ) : null}

      {c.subject ? (
        <section className="section" aria-labelledby="h-subj">
          <h3 id="h-subj" className="set-gt">
            {t("case.subject")}
          </h3>
          <p>
            <b>{c.subject.displayName}</b>
            {c.subject.username ? ` @${c.subject.username}` : ""} ·{" "}
            {t(`status.${c.subject.status as "active"}`)}
          </p>
        </section>
      ) : null}

      <section className="section" aria-labelledby="h-copy">
        <h3 id="h-copy" className="set-gt">
          {t("case.copy")}
        </h3>
        {c.snapshots.length ? (
          c.snapshots.map((s, i) => (
            <blockquote key={i} className="sor-item">
              <span className="set-d">
                {t(`target.${s.objectType as "answer"}`)} ·{" "}
                {t("case.captured", { date: f.dateTime(s.capturedAt, WHEN) })}
              </span>
              {copyText(s.content).map((line, j) => (
                <span key={j}>{line}</span>
              ))}
            </blockquote>
          ))
        ) : (
          <p className="set-d">{t("case.noCopy")}</p>
        )}
        <p className="meta">
          {t(`current.${c.current.state}`)}
          {c.current.edited ? ` · ${t("case.editedSince")}` : ""}
          {c.current.href && c.current.state === "live" ? (
            <>
              {" · "}
              <Link href={c.current.href} className="link">
                {t("case.openInApp")}
              </Link>
            </>
          ) : null}
        </p>
      </section>

      {c.reports.length ? (
        <section className="section" aria-labelledby="h-reps">
          <h3 id="h-reps" className="set-gt">
            {t("case.reports", { count: c.reports.length })}
          </h3>
          <ol className="mod-reports">
            {c.reports.map((r) => (
              <li key={r.n}>
                <p className="set-t">
                  {t("case.reportN", { n: r.n })} · {ts(`cat.${r.category}.name`)}
                </p>
                <p className="meta">{f.dateTime(r.createdAt, WHEN)}</p>
                {r.details ? <p className="mod-details">{r.details}</p> : null}
              </li>
            ))}
          </ol>
          <p className="meta">{t("case.reportersHidden")}</p>
        </section>
      ) : null}

      {c.notices.length ? (
        <section className="section" aria-labelledby="h-dsa">
          <h3 id="h-dsa" className="set-gt">
            {t("case.notices")}
          </h3>
          {c.notices.map((n) => (
            <div key={n.id} className="mod-notice">
              <p className="set-t">{tn(`categories.${n.category as "other"}`)}</p>
              <p className="meta">{f.dateTime(n.createdAt, WHEN)}</p>
              <p>
                <span className="set-d">{t("case.url")}</span>{" "}
                <code className="mod-url">{n.url}</code>
              </p>
              <p className="mod-details">{n.explanation}</p>
              <p className="meta">
                {n.notifierName || n.notifierEmail
                  ? t("case.notifier", {
                      name: n.notifierName ?? "—",
                      email: n.notifierEmail ?? "—",
                    })
                  : t("case.notifierNone")}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {c.history.length ? (
        <section className="section" aria-labelledby="h-hist">
          <h3 id="h-hist" className="set-gt">
            {t("case.history")}
          </h3>
          <ul className="mod-history">
            {c.history.map((h) => (
              <li key={h.id}>
                {t(`kind.${h.kind}`)}
                {h.rule ? ` · ${ts(`rule.${h.rule as "respect"}`)}` : ""} ·{" "}
                {f.dateTime(h.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                {h.revokedAt ? ` · ${t("case.revoked")}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!open ? (
        <section className="section" aria-labelledby="h-dec">
          <h3 id="h-dec" className="set-gt">
            {t("case.decision")}
          </h3>
          <p>
            {c.outcome ? t(`outcome.${c.outcome as "action"}`) : "—"}
            {c.decidedAt ? ` · ${f.dateTime(c.decidedAt, WHEN)}` : ""}
            {c.decidedByMe ? ` · ${t("case.byYou")}` : ""}
          </p>
          {c.actions.map((a) => (
            <div key={a.id} className="sor-item">
              <span className="set-d">
                {t(`kind.${a.kind}`)}
                {a.rule ? ` · ${ts(`rule.${a.rule as "respect"}`)}` : ""}
              </span>
              <span>{a.statement}</span>
            </div>
          ))}
        </section>
      ) : canDecide ? (
        <section className="section" aria-labelledby="h-dec">
          <h3 id="h-dec" className="set-gt">
            {t("case.decide")}
          </h3>
          <DecisionForm
            caseId={c.id}
            content={content}
            subjectless={!c.subject}
            involved={c.conflict === "involved"}
            suggestedRule={firstCat ? RULE_FOR_CATEGORY[firstCat] : "illegal"}
          />
          {mine ? <ReleaseCase caseId={c.id} /> : null}
        </section>
      ) : open && c.assignee !== "me" ? (
        <TakeCase caseId={c.id} label={t("queue.take")} />
      ) : null}
    </section>
  );
}
