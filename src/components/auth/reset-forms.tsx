"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  requestResetAction,
  resendVerificationAction,
  resetPasswordAction,
  type FormState,
} from "@/lib/auth/actions";
import { Link } from "@/i18n/navigation";
import { PasswordField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";
import { IconInfo } from "@/components/ui/icons";

export function RequestResetForm({ email }: { email?: string }) {
  const t = useTranslations("auth.reset");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(requestResetAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead">{t("lead")}</p>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <TextField
        name="email"
        label={t("email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email ?? email}
        error={state.fieldErrors?.email ? te(state.fieldErrors.email) : null}
      />
      <SubmitButton busyLabel={t("submitting")}>{t("submit")}</SubmitButton>
      <Link href="/sign-in" className="link link-row">
        {t("backToSignIn")}
      </Link>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <PasswordField
        name="password"
        label={t("newPassword")}
        help={t("newHelp")}
        autoComplete="new-password"
        rules
        error={state.fieldErrors?.password ? te(state.fieldErrors.password) : null}
      />
      <p className="help ret-line">
        <IconInfo />
        <span>{t("revokeNote")}</span>
      </p>
      <SubmitButton busyLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const t = useTranslations("auth.checkEmail");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(resendVerificationAction, {});
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="email" value={email} />
      {state.ok ? <Notice kind="success">{t("resent")}</Notice> : null}
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
      <p className="fine">
        {t("notArrived")}{" "}
        <button type="submit" className="link">
          {t("resend")}
        </button>
      </p>
    </form>
  );
}
