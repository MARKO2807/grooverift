"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { submitNoticeAction, type NoticeFormState } from "@/lib/legal/actions";
import { EXPLANATION_MAX, NOTICE_CATEGORIES, PHOTO_REASONS } from "@/lib/legal/notice";
import { FieldError, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFocusRef } from "@/components/ui/form-status";
import { IconCheck } from "@/components/ui/icons";

// i18n-keys: notice.categories.csam notice.categories.hate notice.categories.threat notice.categories.privacy
// i18n-keys: notice.categories.copyright notice.categories.fraud notice.categories.other
// i18n-keys: notice.errors.generic notice.errors.tooMany
// i18n-keys: notice.photo.reasons.wrongPerson notice.photo.reasons.author notice.photo.reasons.credit
// i18n-keys: notice.photo.reasons.other

/** PUB-11: the DSA Art. 16 notice form, usable without an account (components §4.2, §4.4). */
export function NoticeForm({
  photo,
}: {
  /** Step 5.11: a report about an artist photo ("Prijavi problem" in "O fotografiji"). */
  photo?: { artistId: string; name: string; url: string };
}) {
  const t = useTranslations("notice");
  const [state, action] = useActionState<NoticeFormState, FormData>(submitNoticeAction, {});
  const [category, setCategory] = useState<string>(state.values?.category ?? "");
  // "Send another" dismisses this result; a later submission returns a new state object and shows again.
  const [dismissed, setDismissed] = useState<NoticeFormState | null>(null);
  const showDone = !!state.done && dismissed !== state;
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useFocusRef<HTMLHeadingElement>(showDone);
  const id = useId();
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  // Errors on submit: focus the summary, which names the problem; each field carries its own error.
  useEffect(() => {
    if (state.fieldErrors || state.error) summaryRef.current?.focus();
  }, [state]);

  if (showDone) {
    return (
      <div className="form-stack" role="status">
        <h2 ref={doneRef} tabIndex={-1}>
          {t("doneTitle")}
        </h2>
        <p>{t("doneText")}</p>
        <button type="button" className="btn btn-secondary" onClick={() => setDismissed(state)}>
          {t("another")}
        </button>
      </div>
    );
  }

  const catErr = fe.category ? t(`errors.${fe.category}`) : null;
  const explErrId = `${id}-expl-err`;
  return (
    <form
      ref={formRef}
      action={action}
      className="form-stack"
      noValidate
      key={dismissed ? "again" : "first"}
    >
      {state.fieldErrors || state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">
            {state.error ? t(`errors.${state.error}`) : t("errors.summary")}
          </Notice>
        </ErrorSummary>
      ) : null}
      {photo ? (
        <fieldset
          className="choices"
          aria-invalid={fe.photoReason ? true : undefined}
          aria-describedby={fe.photoReason ? `${id}-pr-err` : `${id}-pr-help`}
        >
          <legend>{t("photo.legend", { name: photo.name })}</legend>
          <input type="hidden" name="photoArtist" value={photo.artistId} />
          <p className="help" id={`${id}-pr-help`}>
            {t("photo.help")}
          </p>
          {PHOTO_REASONS.map((r) => (
            <label className="choice" key={r}>
              <input
                type="radio"
                name="photoReason"
                value={r}
                defaultChecked={v.photoReason === r}
              />
              <span className="choice-mark" aria-hidden="true">
                <IconCheck />
              </span>
              <span>{t(`photo.reasons.${r}`)}</span>
            </label>
          ))}
          {fe.photoReason ? (
            <FieldError id={`${id}-pr-err`} text={t(`errors.${fe.photoReason}`)} />
          ) : null}
        </fieldset>
      ) : null}
      <fieldset
        className="choices"
        aria-invalid={catErr ? true : undefined}
        aria-describedby={catErr ? `${id}-cat-err` : undefined}
      >
        <legend>{t("categoryLegend")}</legend>
        {NOTICE_CATEGORIES.map((c) => (
          <label className="choice" key={c}>
            <input
              type="radio"
              name="category"
              value={c}
              defaultChecked={v.category === c}
              onChange={() => setCategory(c)}
            />
            <span className="choice-mark" aria-hidden="true">
              <IconCheck />
            </span>
            <span>{t(`categories.${c}`)}</span>
          </label>
        ))}
        {catErr ? <FieldError id={`${id}-cat-err`} text={catErr} /> : null}
      </fieldset>
      <TextField
        name="url"
        label={t("urlLabel")}
        help={t("urlHelp")}
        type="text"
        inputMode="text"
        autoComplete="url"
        defaultValue={v.url ?? photo?.url}
        required
        error={fe.url ? t(`errors.${fe.url}`) : null}
      />
      <div className="field">
        <label className="label" htmlFor={`${id}-expl`}>
          {t("explanationLabel")}
        </label>
        <p className="help" id={`${id}-expl-help`}>
          {t("explanationHelp")}
        </p>
        <textarea
          className="textarea"
          id={`${id}-expl`}
          name="explanation"
          rows={6}
          maxLength={EXPLANATION_MAX}
          defaultValue={v.explanation}
          required
          aria-invalid={fe.explanation ? true : undefined}
          aria-describedby={`${id}-expl-help${fe.explanation ? ` ${explErrId}` : ""}`}
        />
        {fe.explanation ? <FieldError id={explErrId} text={t(`errors.${fe.explanation}`)} /> : null}
      </div>
      <fieldset className="form-stack" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend className="label" style={{ padding: 0, marginBottom: "var(--gr-space-2)" }}>
          {t("contactLegend")}
        </legend>
        <p className="help">
          {t("contactHelp")} {category === "csam" ? t("contactOptional") : null}
        </p>
        <TextField
          name="name"
          label={t("nameLabel")}
          autoComplete="name"
          defaultValue={v.name}
          required={category !== "csam"}
          error={fe.name ? t(`errors.${fe.name}`) : null}
        />
        <TextField
          name="email"
          label={t("emailLabel")}
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={v.email}
          required={category !== "csam"}
          error={fe.email ? t(`errors.${fe.email}`) : null}
        />
      </fieldset>
      <div className="field">
        <label className="check-row">
          <input
            type="checkbox"
            name="goodFaith"
            aria-invalid={fe.goodFaith ? true : undefined}
            aria-describedby={fe.goodFaith ? `${id}-gf-err` : undefined}
          />
          <span>{t("goodFaith")}</span>
        </label>
        {fe.goodFaith ? (
          <FieldError id={`${id}-gf-err`} text={t(`errors.${fe.goodFaith}`)} />
        ) : null}
      </div>
      <SubmitButton busyLabel={t("sending")}>{t("submit")}</SubmitButton>
    </form>
  );
}
