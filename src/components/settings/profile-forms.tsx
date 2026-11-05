"use client";

import { useActionState, useId, useRef } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { FormState } from "@/lib/auth/actions";
import { BIO_MAX, DISPLAY_NAME_MAX } from "@/lib/profile/constants";
import { changeUsernameAction, updateProfileAction } from "@/lib/profile/actions";
import { FieldError, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

// PROF-08 (D-078): display name and bio; the username change with the D-069 rule. Real forms posting to server
// actions; errors are message keys, typed values stay, focus moves to the error (components §4.2).

export function EditProfileForm({ displayName, bio }: { displayName: string; bio: string }) {
  const t = useTranslations("settings.profile");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const id = useId();
  const bioErr = state.fieldErrors?.bio ? te(state.fieldErrors.bio) : null;
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      {state.ok ? <Notice kind="success">{t("saved")}</Notice> : null}
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <TextField
        name="displayName"
        label={t("displayName")}
        help={t("displayNameHelp")}
        defaultValue={state.values?.displayName ?? displayName}
        autoComplete="nickname"
        maxLength={DISPLAY_NAME_MAX}
        required
        error={state.fieldErrors?.displayName ? te(state.fieldErrors.displayName) : null}
      />
      <div className="field">
        <label className="label" htmlFor={`${id}-bio`}>
          {t("bio")} <span className="opt">{t("optional")}</span>
        </label>
        <p className="help" id={`${id}-bio-help`}>
          {t("bioHelp", { max: BIO_MAX })}
        </p>
        <textarea
          id={`${id}-bio`}
          name="bio"
          className="textarea textarea-sm"
          rows={3}
          maxLength={BIO_MAX}
          defaultValue={state.values?.bio ?? bio}
          aria-describedby={`${id}-bio-help${bioErr ? ` ${id}-bio-err` : ""}`}
          aria-invalid={bioErr ? true : undefined}
        />
        {bioErr ? <FieldError id={`${id}-bio-err`} text={bioErr} /> : null}
      </div>
      <p className="hint">{t("photoLater")}</p>
      <SubmitButton busyLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}

export function ChangeUsernameForm({
  username,
  nextAt,
}: {
  username: string;
  /** When the next change is allowed; null = now (D-069). */
  nextAt: Date | null;
}) {
  const t = useTranslations("settings.profile");
  const te = useTranslations("authErrors");
  const f = useFormatter();
  const [state, action] = useActionState<FormState, FormData>(changeUsernameAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="meta">@{username}</p>
      <p className="hint">{t("usernameLead")}</p>
      {nextAt ? (
        <Notice kind="info">
          {t("nextAt", {
            date: f.dateTime(nextAt, { day: "numeric", month: "long", year: "numeric" }),
          })}
        </Notice>
      ) : null}
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <TextField
        name="username"
        label={t("username")}
        help={t("usernameHelp")}
        defaultValue={state.values?.username ?? ""}
        autoComplete="username"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={30}
        required
        error={state.fieldErrors?.username ? te(state.fieldErrors.username) : null}
      />
      <SubmitButton busyLabel={t("changing")} variant="secondary">
        {t("change")}
      </SubmitButton>
    </form>
  );
}
