"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import {
  decideAppealAction,
  decideCaseAction,
  releaseCaseAction,
  takeCaseAction,
  type ModerationFailure,
} from "@/lib/moderation/actions";
import {
  ACTION_KINDS,
  RESTRICTION_DAYS,
  RULES,
  STATEMENT_MAX,
  SUSPENSION_DAYS,
  type ActionKind,
  type Rule,
} from "@/lib/moderation/rules";

// ADM-10 and ADM-11 controls (step 5.9). The server decides everything again (role, second factor, assignment,
// conflict of interest, the decision's shape); these forms only collect the values and show the outcome.

// i18n-keys: moderation.kind.content_removal moderation.kind.notice moderation.kind.warning
// i18n-keys: moderation.kind.restriction moderation.kind.suspension moderation.kind.ban
// i18n-keys: safety.rule.respect safety.rule.hate safety.rule.violence safety.rule.sexual safety.rule.adults
// i18n-keys: safety.rule.authentic safety.rule.spam safety.rule.copyright safety.rule.ai safety.rule.privacy
// i18n-keys: safety.rule.illegal
// i18n-keys: moderation.decide.outcome_none moderation.decide.outcome_action moderation.decide.kind
// i18n-keys: moderation.decide.days moderation.decide.rule moderation.decide.statement moderation.decide.override
// i18n-keys: moderation.appeal.outcome moderation.appeal.text moderation.appeal.submit moderation.appeal.done

function useFail() {
  const t = useTranslations("moderation.error");
  return (r: ModerationFailure) => t(r);
}

export function TakeCase({ caseId, label }: { caseId: string; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const fail = useFail();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      aria-disabled={pending || undefined}
      onClick={() =>
        !pending &&
        start(async () => {
          const r = await takeCaseAction(caseId);
          if (r.ok) router.push(`/admin/moderation/cases/${caseId}`);
          else toast.show(fail(r.reason));
        })
      }
    >
      {label}
    </button>
  );
}

export function ReleaseCase({ caseId }: { caseId: string }) {
  const t = useTranslations("moderation.case");
  const router = useRouter();
  const toast = useToast();
  const fail = useFail();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      aria-disabled={pending || undefined}
      onClick={() =>
        !pending &&
        start(async () => {
          const r = await releaseCaseAction(caseId);
          if (r.ok) router.push("/admin/moderation");
          else toast.show(fail(r.reason));
        })
      }
    >
      {t("release")}
    </button>
  );
}

/**
 * The decision (ADM-10): no violation, or one consequence with the rule and the statement of reasons the member
 * reads (R-07). `content` says whether the case is about an answer or a comment (removal possible); `subjectless`
 * is a DSA notice about something that is not one of our objects (only a record fits); `involved` asks an admin
 * for the stated reason to decide despite a conflict of interest (J5 E3).
 */
export function DecisionForm({
  caseId,
  content,
  subjectless,
  involved,
  suggestedRule,
}: {
  caseId: string;
  content: boolean;
  subjectless: boolean;
  involved: boolean;
  suggestedRule: Rule;
}) {
  const t = useTranslations("moderation.decide");
  const tk = useTranslations("moderation.kind");
  const tr = useTranslations("safety.rule");
  const router = useRouter();
  const toast = useToast();
  const fail = useFail();
  const id = useId();
  const [outcome, setOutcome] = useState<"none" | "action">("none");
  const [kind, setKind] = useState<ActionKind>(subjectless ? "notice" : "warning");
  const [days, setDays] = useState<number>(3);
  const [rule, setRule] = useState<Rule>(suggestedRule);
  const [remove, setRemove] = useState(content);
  const [statement, setStatement] = useState("");
  const [override, setOverride] = useState("");
  const [error, setError] = useState<ModerationFailure | null>(null);
  const [pending, start] = useTransition();

  const kinds = subjectless
    ? (["notice"] as const)
    : ACTION_KINDS.filter((k) => content || k !== "content_removal");
  const dayOptions =
    kind === "restriction" ? RESTRICTION_DAYS : kind === "suspension" ? SUSPENSION_DAYS : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await decideCaseAction(caseId, {
        outcome,
        kind,
        rule,
        statement,
        days: dayOptions ? days : undefined,
        removeContent: content && (kind === "content_removal" || remove),
        override: involved ? override : undefined,
      });
      if (r.ok) {
        toast.show(t("done"));
        router.refresh();
      } else setError(r.reason);
    });
  };

  return (
    <form className="form-stack mod-decide" onSubmit={submit} noValidate>
      <fieldset className="choices">
        <legend>{t("outcome")}</legend>
        {(["none", "action"] as const).map((o) => (
          <label key={o} className="check-row">
            <input
              type="radio"
              name={`${id}-o`}
              checked={outcome === o}
              onChange={() => setOutcome(o)}
            />
            <span>{t(`outcome_${o}`)}</span>
          </label>
        ))}
      </fieldset>

      {outcome === "action" ? (
        <>
          <div className="field">
            <label className="label" htmlFor={`${id}-k`}>
              {t("kind")}
            </label>
            <select
              id={`${id}-k`}
              className="select"
              value={kind}
              onChange={(e) => setKind(e.target.value as ActionKind)}
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {tk(k)}
                </option>
              ))}
            </select>
          </div>
          {dayOptions ? (
            <div className="field">
              <label className="label" htmlFor={`${id}-d`}>
                {t("days")}
              </label>
              <select
                id={`${id}-d`}
                className="select"
                value={dayOptions.includes(days as never) ? days : dayOptions[0]}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {dayOptions.map((d) => (
                  <option key={d} value={d}>
                    {t("daysN", { count: d })}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {content && kind !== "content_removal" ? (
            <label className="check-row">
              <input
                type="checkbox"
                checked={remove}
                onChange={(e) => setRemove(e.target.checked)}
              />
              <span>{t("remove")}</span>
            </label>
          ) : null}
          <div className="field">
            <label className="label" htmlFor={`${id}-r`}>
              {t("rule")}
            </label>
            <select
              id={`${id}-r`}
              className="select"
              value={rule}
              onChange={(e) => setRule(e.target.value as Rule)}
            >
              {RULES.map((r) => (
                <option key={r} value={r}>
                  {tr(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor={`${id}-s`}>
              {t("statement")}
            </label>
            <textarea
              id={`${id}-s`}
              className="textarea"
              rows={5}
              maxLength={STATEMENT_MAX}
              value={statement}
              aria-describedby={`${id}-sh`}
              onChange={(e) => setStatement(e.target.value)}
            />
            <p className="help" id={`${id}-sh`}>
              {t("statementHelp")}
            </p>
          </div>
          {kind === "suspension" || kind === "ban" ? (
            <p className="meta">{t("freshNote")}</p>
          ) : null}
        </>
      ) : (
        <p className="help">{t("noneHelp")}</p>
      )}

      {involved ? (
        <div className="field">
          <label className="label" htmlFor={`${id}-ov`}>
            {t("override")}
          </label>
          <textarea
            id={`${id}-ov`}
            className="textarea textarea-sm"
            rows={2}
            value={override}
            aria-describedby={`${id}-ovh`}
            onChange={(e) => setOverride(e.target.value)}
          />
          <p className="help" id={`${id}-ovh`}>
            {t("overrideHelp")}
          </p>
        </div>
      ) : null}

      {error ? (
        <div role="alert">
          <Notice kind="error">{fail(error)}</Notice>
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {t("submit")}
      </button>
    </form>
  );
}

/** ADM-11: uphold or overturn, with the reasons the member reads (DSA Art. 20(5)). */
export function AppealDecisionForm({
  appealId,
  involved = false,
}: {
  appealId: string;
  involved?: boolean;
}) {
  const t = useTranslations("moderation.appeal");
  const router = useRouter();
  const toast = useToast();
  const fail = useFail();
  const id = useId();
  const [outcome, setOutcome] = useState<"upheld" | "overturned">("upheld");
  const [text, setText] = useState("");
  const [override, setOverride] = useState("");
  const td = useTranslations("moderation.decide");
  const [error, setError] = useState<ModerationFailure | null>(null);
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await decideAppealAction(appealId, outcome, text, involved ? override : undefined);
      if (r.ok) {
        toast.show(t("done"));
        router.refresh();
      } else setError(r.reason);
    });
  };
  return (
    <form className="form-stack" onSubmit={submit} noValidate>
      <fieldset className="choices">
        <legend>{t("outcome")}</legend>
        {(["upheld", "overturned"] as const).map((o) => (
          <label key={o} className="check-row">
            <input
              type="radio"
              name={`${id}-o`}
              checked={outcome === o}
              onChange={() => setOutcome(o)}
            />
            <span>{t(o)}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label className="label" htmlFor={`${id}-t`}>
          {t("text")}
        </label>
        <textarea
          id={`${id}-t`}
          className="textarea"
          rows={4}
          maxLength={STATEMENT_MAX}
          value={text}
          aria-describedby={`${id}-h`}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="help" id={`${id}-h`}>
          {t("textHelp")}
        </p>
      </div>
      {involved ? (
        <div className="field">
          <label className="label" htmlFor={`${id}-ov`}>
            {td("override")}
          </label>
          <textarea
            id={`${id}-ov`}
            className="textarea textarea-sm"
            rows={2}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </div>
      ) : null}
      {error ? (
        <div role="alert">
          <Notice kind="error">{fail(error)}</Notice>
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {t("submit")}
      </button>
    </form>
  );
}
