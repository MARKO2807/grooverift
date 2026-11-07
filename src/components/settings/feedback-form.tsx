"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { FieldError } from "@/components/ui/field";
import { IconCheck, IconCheckCircle } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { sendFeedbackAction, type AccountFailure } from "@/lib/account/actions";
import { ACCEPT, MAX_UPLOAD_BYTES } from "@/lib/media/rules";
import {
  deviceLabel,
  FEEDBACK_KINDS,
  FEEDBACK_MAX,
  type FeedbackContextKey,
  type FeedbackKind,
} from "@/lib/account/rules";

// i18n-keys: account.feedback.kind.bug.title account.feedback.kind.bug.desc account.feedback.kind.idea.title
// i18n-keys: account.feedback.kind.idea.desc account.feedback.kind.other.title account.feedback.kind.other.desc
// i18n-keys: account.feedback.ctx.screen account.feedback.ctx.version account.feedback.ctx.device
// i18n-keys: account.feedback.ctx.time account.feedback.screens.home account.feedback.screens.hub
// i18n-keys: account.feedback.screens.drop account.feedback.screens.activity account.feedback.screens.profile
// i18n-keys: account.feedback.screens.settings account.feedback.screens.search account.feedback.screens.other
// i18n-keys: account.error.signedOut account.error.tooMany account.error.generic account.error.invalid
// i18n-keys: account.error.required account.error.image

/** The section of the app the member came from, never the path itself (it can hold another member's @name). */
function screenOf(referrer: string): string {
  try {
    const u = new URL(referrer);
    if (u.origin !== window.location.origin) return "other";
    const segs = u.pathname.split("/").filter(Boolean);
    const first = segs[0] === "en" || segs[0] === "hr" ? segs[1] : segs[0];
    if (!first) return "other";
    if (first.startsWith("@") || first === "me") return "profile";
    if (["home", "hub", "drop", "activity", "settings", "search"].includes(first)) return first;
    return "other";
  } catch {
    return "other";
  }
}

const NO_LIST = { listStyle: "none", padding: 0, margin: 0 } as const;

/**
 * SET-12 (D-078 (5), option A): one form with the type on top. Separate from abuse reports (Master Prompt §13);
 * the technical details are listed before sending and each can be unticked; a reply by email is a ticked choice.
 * Step 5.11: an optional screenshot, seen by the team only, deleted when the message is handled and at the latest
 * after 90 days (D-078, D-118 (6)); it is re-encoded on the server, so no location or device data travels with it.
 */
export function FeedbackForm({ email }: { email: string }) {
  const t = useTranslations("account.feedback");
  const te = useTranslations("account.error");
  const format = useFormatter();
  const id = useId();
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState(true);
  const [context, setContext] = useState<Record<FeedbackContextKey, string> | null>(null);
  const [include, setInclude] = useState<Record<FeedbackContextKey, boolean>>({
    screen: true,
    version: true,
    device: true,
    time: true,
  });
  const [errors, setErrors] = useState<{ kind?: boolean; text?: string; form?: AccountFailure }>(
    {},
  );
  const [sent, setSent] = useState<null | { reply: boolean }>(null);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const shotInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => (shot ? URL.revokeObjectURL(shot.url) : undefined), [shot]);
  const [pending, start] = useTransition();
  const doneRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // The details are read in the browser (never during the server render) the first time they are needed: when the
  // member opens "Što šaljemo uz poruku", or at sending. What is listed is exactly what is sent.
  const readContext = (): Record<FeedbackContextKey, string> => {
    if (context) return context;
    const next = {
      screen: t(`screens.${screenOf(document.referrer)}`),
      version: t("versionValue"),
      device: deviceLabel(navigator.userAgent) ?? t("unknownDevice"),
      time: format.dateTime(new Date(), {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setContext(next);
    return next;
  };
  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  if (sent)
    return (
      <div className="form-stack">
        <div className="sub-hero">
          <IconCheckCircle />
          <p className="sub-hero-t" ref={doneRef} tabIndex={-1}>
            {t("sentTitle")}
          </p>
          <p className="help">{sent.reply ? t("sentReply", { email }) : t("sentNoReply")}</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => {
            setSent(null);
            setKind(null);
            setText("");
            setShot(null);
          }}
        >
          {t("again")}
        </button>
      </div>
    );

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const next: typeof errors = {};
    if (!kind) next.kind = true;
    if (!text.trim()) next.text = te("required");
    else if (text.trim().length > FEEDBACK_MAX) next.text = te("invalid");
    setErrors(next);
    if (next.kind || next.text) {
      requestAnimationFrame(() => {
        const form = formRef.current;
        const target = next.kind
          ? form?.querySelector<HTMLElement>('input[name="kind"]')
          : form?.querySelector<HTMLElement>("textarea");
        target?.focus();
      });
      return;
    }
    const all = readContext();
    const ctx = Object.fromEntries(
      (Object.keys(all) as FeedbackContextKey[]).filter((k) => include[k]).map((k) => [k, all[k]]),
    );
    start(async () => {
      let files: FormData | undefined;
      if (shot) {
        files = new FormData();
        files.set("screenshot", shot.file);
      }
      const r = await sendFeedbackAction({ kind, text, context: ctx, replyByEmail: reply }, files);
      if (r.ok) setSent({ reply });
      else setErrors({ form: r.reason });
    });
  };

  return (
    <form ref={formRef} className="form-stack" noValidate onSubmit={submit}>
      <fieldset
        className="choices"
        aria-describedby={errors.kind ? `${id}-kind-err` : undefined}
        aria-invalid={errors.kind || undefined}
      >
        <legend>{t("kindLegend")}</legend>
        {FEEDBACK_KINDS.map((k) => (
          <label key={k} className="choice">
            <input
              type="radio"
              name="kind"
              value={k}
              checked={kind === k}
              onChange={() => {
                setKind(k);
                setErrors((x) => ({ ...x, kind: false }));
              }}
            />
            <span className="choice-mark" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="choice-body">
              <span className="choice-title">{t(`kind.${k}.title`)}</span>
              <span className="choice-desc">{t(`kind.${k}.desc`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {errors.kind ? <FieldError id={`${id}-kind-err`} text={t("kindError")} /> : null}

      <div className="field">
        <label className="label" htmlFor={`${id}-text`}>
          {t("text")}
        </label>
        <p className="help" id={`${id}-text-help`}>
          {t("textHelp", { max: FEEDBACK_MAX })}
        </p>
        <textarea
          id={`${id}-text`}
          className="input textarea"
          rows={6}
          maxLength={FEEDBACK_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby={[`${id}-text-help`, errors.text ? `${id}-text-err` : ""]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={errors.text ? true : undefined}
        />
        {errors.text ? <FieldError id={`${id}-text-err`} text={errors.text} /> : null}
      </div>

      <div className="field">
        <span className="label" id={`${id}-shot-l`}>
          {t("shot")}
        </span>
        <p className="help" id={`${id}-shot-help`}>
          {t("shotHelp")}
        </p>
        <input
          ref={shotInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > MAX_UPLOAD_BYTES || !ACCEPT.split(",").includes(file.type)) {
              setErrors((x) => ({ ...x, form: "image" }));
              return;
            }
            setErrors((x) => ({ ...x, form: undefined }));
            setShot({ file, url: URL.createObjectURL(file) });
          }}
        />
        {shot ? (
          <div className="fb-shot">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
            <img src={shot.url} alt={t("shotPreview")} />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShot(null)}
            >
              {t("shotRemove")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-describedby={`${id}-shot-l ${id}-shot-help`}
            onClick={() => shotInput.current?.click()}
          >
            {t("shotAdd")}
          </button>
        )}
      </div>

      <details
        className="fb-info"
        onToggle={(e) => {
          if (e.currentTarget.open) readContext();
        }}
      >
        <summary>{t("detailsTitle")}</summary>
        {context ? (
          <ul style={NO_LIST}>
            {(Object.keys(context) as FeedbackContextKey[]).map((k) => (
              <li key={k}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={include[k]}
                    onChange={() => setInclude((x) => ({ ...x, [k]: !x[k] }))}
                  />
                  <span>
                    {t(`ctx.${k}`)}: {context[k]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="help">{t("detailsNote")}</p>
      </details>

      <label className="fb-reply">
        <input type="checkbox" checked={reply} onChange={() => setReply((r) => !r)} />
        <span>{t("reply", { email })}</span>
      </label>

      {errors.form ? (
        <div role="alert">
          <Notice kind="error">{te(errors.form)}</Notice>
        </div>
      ) : null}
      <button
        type="submit"
        className="btn btn-primary btn-block"
        aria-disabled={pending || undefined}
      >
        {pending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
