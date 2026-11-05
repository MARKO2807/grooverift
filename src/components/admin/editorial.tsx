"use client";

import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  createQuestionAction,
  deleteQuestionAction,
  publishNowAction,
  saveQuestionAction,
  transitionAction,
  withdrawQuestionAction,
  type EditorialState,
} from "@/lib/editorial/actions";
import { APPROVE_CHECKLIST, goLiveAt, QUESTION_MAX, type DropLocale } from "@/lib/editorial/rules";
import { FieldError } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";
import { useToast } from "@/components/ui/toast";

// ADM-04/05/09 forms (step 5.6, J6). Real forms posting to server actions; the role is checked there. Errors stay
// in the page as alerts, successes are a toast (components §4.9, §4.10). HR and EN fields carry lang attributes.

const LANG_NAME: Record<DropLocale, string> = { hr: "Hrvatski", en: "English" };

/** "Goes live at 00:00 UTC, for you …" in the browser's own zone (J6 E5, E6); empty until hydrated. */
export function LocalTime({
  date,
  unlessSameAs,
  lead = false,
}: {
  date: string;
  /** Calendar rows: show the hint only when the local time of day differs from this date's (a DST change). */
  unlessSameAs?: string;
  /** The calendar's one-line lead: "00:00 UTC is 01:00 for you today". */
  lead?: boolean;
}) {
  const tl = useTranslations("admin.editorial.calendar");
  const locale = useLocale();
  // The browser's zone is a client-only value: the server renders nothing and the client fills it in.
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const at = goLiveAt(date);
  if (!client || Number.isNaN(at.getTime())) return null;
  const intl = locale === "en" ? "en-GB" : "hr-HR";
  const clock = (d: Date) =>
    new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit" }).format(d);
  if (lead) return <p className="meta">{tl("localLead", { time: clock(at) })}</p>;
  if (unlessSameAs && clock(goLiveAt(unlessSameAs)) === clock(at)) return null;
  const text = new Intl.DateTimeFormat(intl, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
  return <span className="meta">{tl("localHint", { time: text })}</span>;
}

function QuestionField({
  locale,
  defaultValue,
  invalid,
}: {
  locale: DropLocale;
  defaultValue: string;
  invalid: boolean;
}) {
  const tx = useTranslations("admin.editorial.editor");
  const id = useId();
  const [length, setLength] = useState([...defaultValue].length);
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {LANG_NAME[locale]}
      </label>
      <textarea
        id={id}
        name={locale}
        lang={locale}
        className="textarea"
        rows={4}
        maxLength={QUESTION_MAX}
        defaultValue={defaultValue}
        onChange={(e) => setLength([...e.target.value].length)}
        aria-describedby={`${id}-count`}
        aria-invalid={invalid || undefined}
      />
      <p className="ed-count" id={`${id}-count`} data-over={length > QUESTION_MAX}>
        {tx("count", { n: length, max: QUESTION_MAX })}
      </p>
    </div>
  );
}

/** ADM-05: both languages side by side. With a conflict (J6 E2) the saved version is shown beside the editor's. */
export function QuestionEditor(
  props:
    | { mode: "create" }
    | {
        mode: "edit";
        id: string;
        version: number;
        hr: string;
        en: string;
        /** A save in review sends the question back to draft (J6), so the button says so. */
        inReview?: boolean;
      },
) {
  const tx = useTranslations("admin.editorial.editor");
  const te = useTranslations("admin.editorial.errors");
  const [state, action] = useActionState<EditorialState, FormData>(
    props.mode === "create" ? createQuestionAction : saveQuestionAction,
    {},
  );
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  useEffect(() => {
    if (state.ok) toast.show(tx("saved"));
  }, [state, toast, tx]);
  const hr = state.values?.hr ?? (props.mode === "edit" ? props.hr : "");
  const en = state.values?.en ?? (props.mode === "edit" ? props.en : "");
  const conflict = state.conflict;
  const inReview = props.mode === "edit" && !!props.inReview;
  const version = conflict?.version ?? (props.mode === "edit" ? props.version : 0);
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      {props.mode === "edit" ? (
        <>
          <input type="hidden" name="id" value={props.id} />
          <input type="hidden" name="version" value={version} />
        </>
      ) : null}
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      {conflict ? (
        <section className="form-stack" aria-labelledby="ed-conflict">
          <h3 id="ed-conflict" className="set-t">
            {tx("conflictTitle")}
          </h3>
          <p className="meta">{tx("conflictLead")}</p>
          <div className="ed-pair">
            {(["hr", "en"] as const).map((l) => (
              <div key={l} className="form-stack" style={{ gap: "var(--gr-space-2)" }}>
                <span className="label">
                  {tx("savedVersion")} · {LANG_NAME[l]}
                </span>
                <p lang={l} className={`ed-text${conflict[l] ? "" : " ed-text-missing"}`}>
                  {conflict[l] || tx("missing")}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => window.location.reload()}
          >
            {tx("takeSaved")}
          </button>
        </section>
      ) : null}
      <p className="help">{tx("help", { max: QUESTION_MAX })}</p>
      <div className="ed-pair">
        <QuestionField
          key={`hr-${version}`}
          locale="hr"
          defaultValue={hr}
          invalid={state.error === "empty_text"}
        />
        <QuestionField
          key={`en-${version}`}
          locale="en"
          defaultValue={en}
          invalid={state.error === "empty_text"}
        />
      </div>
      <SubmitButton
        busyLabel={tx("saving")}
        block={false}
        variant={inReview ? "secondary" : "primary"}
      >
        {conflict
          ? tx("saveMine")
          : props.mode === "create"
            ? tx("create")
            : inReview
              ? tx("saveToDraft")
              : tx("save")}
      </SubmitButton>
    </form>
  );
}

type Ref = { id: string; version: number };

// i18n-keys: admin.editorial.moves.done.submit admin.editorial.moves.done.requestChanges admin.editorial.moves.done.approve admin.editorial.moves.done.schedule admin.editorial.moves.done.unschedule admin.editorial.moves.done.reserve admin.editorial.moves.done.unreserve admin.editorial.moves.done.toDraft
function useMoveState() {
  const tm = useTranslations("admin.editorial.moves");
  const te = useTranslations("admin.editorial.errors");
  const [state, action] = useActionState<EditorialState, FormData>(transitionAction, {});
  const toast = useToast();
  useEffect(() => {
    if (state.ok && state.outcome) toast.show(tm(`done.${state.outcome}`));
  }, [state, toast, tm]);
  const error = state.error ? <Notice kind="error">{te(state.error)}</Notice> : null;
  return { state, action, error };
}

/** One lifecycle button without further input (submit, request changes, unschedule, unreserve, back to draft). */
export function MoveButton({
  question,
  to,
  label,
  variant = "secondary",
}: {
  question: Ref;
  to: "submit" | "requestChanges" | "unschedule" | "unreserve" | "toDraft";
  label: string;
  variant?: "primary" | "secondary";
}) {
  const tm = useTranslations("admin.editorial.moves");
  const { action, error } = useMoveState();
  return (
    <form action={action} className="form-stack" style={{ gap: "var(--gr-space-2)" }}>
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="version" value={question.version} />
      <input type="hidden" name="to" value={to} />
      <SubmitButton busyLabel={tm("busy")} variant={variant} block={false}>
        {label}
      </SubmitButton>
      {error}
    </form>
  );
}

/** JO3: the editor may approve their own question in the alpha after ticking every item. */
export function ApproveForm({ question }: { question: Ref }) {
  const tm = useTranslations("admin.editorial.moves");
  const { action, error } = useMoveState();
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="version" value={question.version} />
      <input type="hidden" name="to" value="approve" />
      <fieldset className="ed-checks">
        <legend>{tm("checklistTitle")}</legend>
        {APPROVE_CHECKLIST.map((k) => (
          <label key={k} className="check-row">
            <input type="checkbox" name={`check_${k}`} />
            {/* i18n-keys: admin.editorial.moves.check.same admin.editorial.moves.check.spelling admin.editorial.moves.check.open admin.editorial.moves.check.safe */}
            <span>{tm(`check.${k}`)}</span>
          </label>
        ))}
      </fieldset>
      <p className="meta">{tm("selfApprove")}</p>
      <SubmitButton busyLabel={tm("busy")} block={false}>
        {tm("approve")}
      </SubmitButton>
      {error}
    </form>
  );
}

/** J6 E7: a reserve question must not depend on its date. */
export function ReserveForm({ question }: { question: Ref }) {
  const tm = useTranslations("admin.editorial.moves");
  const { action, error } = useMoveState();
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="version" value={question.version} />
      <input type="hidden" name="to" value="reserve" />
      <label className="check-row">
        <input type="checkbox" name="timeless" />
        <span>{tm("timeless")}</span>
      </label>
      <SubmitButton busyLabel={tm("busy")} variant="secondary" block={false}>
        {tm("reserve")}
      </SubmitButton>
      {error}
    </form>
  );
}

/** A UTC date for an approved question; the local hint follows the chosen date (J6 E5). */
export function ScheduleForm({ question, today }: { question: Ref; today: string }) {
  const tm = useTranslations("admin.editorial.moves");
  const { state, action, error } = useMoveState();
  const id = useId();
  const [date, setDate] = useState(state.values?.date ?? "");
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="version" value={question.version} />
      <input type="hidden" name="to" value="schedule" />
      <div className="field">
        <label className="label" htmlFor={id}>
          {tm("dateLabel")}
        </label>
        <p className="help" id={`${id}-help`}>
          {tm("dateHelp")}
        </p>
        <input
          id={id}
          name="date"
          type="date"
          className="input"
          style={{ maxWidth: "14rem" }}
          min={today}
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-describedby={`${id}-help`}
          aria-invalid={state.error === "dateTaken" || state.error === "datePast" || undefined}
        />
        {date ? <LocalTime date={date} /> : null}
      </div>
      <SubmitButton busyLabel={tm("busy")} block={false}>
        {tm("schedule")}
      </SubmitButton>
      {error}
    </form>
  );
}

export function DeleteForm({ question }: { question: Ref }) {
  const tm = useTranslations("admin.editorial.moves");
  const te = useTranslations("admin.editorial.errors");
  const [state, action] = useActionState<EditorialState, FormData>(deleteQuestionAction, {});
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="version" value={question.version} />
      <label className="check-row">
        <input type="checkbox" name="confirm" />
        <span>{tm("deleteConfirm")}</span>
      </label>
      <SubmitButton busyLabel={tm("busy")} variant="danger" block={false}>
        {tm("delete")}
      </SubmitButton>
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
    </form>
  );
}

/** Admin only (J6): a stated reason, a confirmation and a recent sign-in (checked on the server). */
export function WithdrawForm({ question }: { question: Ref }) {
  const tm = useTranslations("admin.editorial.moves");
  const te = useTranslations("admin.editorial.errors");
  const [state, action] = useActionState<EditorialState, FormData>(withdrawQuestionAction, {});
  const toast = useToast();
  const id = useId();
  useEffect(() => {
    if (state.ok) toast.show(tm("withdrawn"));
  }, [state, toast, tm]);
  const err = state.error ? te(state.error) : null;
  return (
    <form action={action} className="form-stack" noValidate>
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="version" value={question.version} />
      <div className="field">
        <label className="label" htmlFor={id}>
          {tm("withdrawReason")}
        </label>
        <p className="help" id={`${id}-help`}>
          {tm("withdrawHelp")}
        </p>
        <textarea
          id={id}
          name="reason"
          className="textarea textarea-sm"
          rows={3}
          maxLength={500}
          defaultValue={state.values?.reason}
          aria-describedby={`${id}-help${err ? ` ${id}-err` : ""}`}
          aria-invalid={err ? true : undefined}
        />
        {err ? <FieldError id={`${id}-err`} text={err} /> : null}
      </div>
      <label className="check-row">
        <input type="checkbox" name="confirm" />
        <span>{tm("withdrawConfirm")}</span>
      </label>
      <SubmitButton busyLabel={tm("busy")} variant="danger" block={false}>
        {tm("withdraw")}
      </SubmitButton>
    </form>
  );
}

// i18n-keys: admin.editorial.jobs.outcome.published admin.editorial.jobs.outcome.reserve admin.editorial.jobs.outcome.skipped admin.editorial.jobs.outcome.already
/** ADM-09 "Publish now" for today's UTC date: the same idempotent run as the job (J6). */
export function PublishNowForm({ today }: { today: string }) {
  const tj = useTranslations("admin.editorial.jobs");
  const te = useTranslations("admin.editorial.errors");
  const [state, action] = useActionState<EditorialState, FormData>(publishNowAction, {});
  return (
    <form action={action} className="form-stack">
      <label className="check-row">
        <input type="checkbox" name="confirm" />
        <span>{tj("publishConfirm", { date: today })}</span>
      </label>
      <SubmitButton busyLabel={tj("publishing")} block={false}>
        {tj("publishNow")}
      </SubmitButton>
      {state.ok && state.outcome ? (
        <Notice kind="success">{tj(`outcome.${state.outcome}`)}</Notice>
      ) : null}
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
    </form>
  );
}
