"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { signUpAction, type FormState } from "@/lib/auth/actions";
import { Link } from "@/i18n/navigation";
import { FieldError, PasswordField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

export function SignUpForm() {
  const t = useTranslations("auth.signUp");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(signUpAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const fe = (name: string) => (state.fieldErrors?.[name] ? te(state.fieldErrors[name]!) : null);

  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead">{t("lead")}</p>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <TextField
        name="name"
        label={t("name")}
        help={t("nameHelp")}
        autoComplete="name"
        required
        maxLength={60}
        defaultValue={state.values?.name}
        error={fe("name")}
      />
      <TextField
        name="email"
        label={t("email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={fe("email")}
      />
      <PasswordField
        name="password"
        label={t("password")}
        help={t("passwordHelp")}
        autoComplete="new-password"
        rules
        error={fe("password")}
      />
      <div className="field">
        <label className="age-check">
          <input
            type="checkbox"
            name="age18"
            aria-invalid={fe("age18") ? true : undefined}
            aria-describedby={fe("age18") ? "age18-err" : undefined}
          />
          <span>{t("age18")}</span>
        </label>
        {fe("age18") ? <FieldError id="age18-err" text={fe("age18")!} /> : null}
      </div>
      <SubmitButton busyLabel={t("submitting")}>{t("submit")}</SubmitButton>
      <p className="fine">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="link">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
