"use client";

import { useActionState, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/auth/actions";
import { createAccountAction, joinWithGoogleAction } from "@/lib/onboarding/actions";
import { PasswordField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

/**
 * /join/account (PUB-05, J1 step 3): the address is the invitation's and read-only; a password per D-061 or Google.
 * A Google account with another address comes back as ?error=INVITE_EMAIL_MISMATCH (J1 E4) and is explained here.
 */
export function AccountForm({
  email,
  googleEnabled,
  oauthError,
}: {
  email: string;
  googleEnabled: boolean;
  oauthError?: string;
}) {
  const t = useTranslations("join.account");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(createAccountAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const emailId = useId();
  useFormErrorFocus(state, formRef, summaryRef);
  const fe = (name: string) => (state.fieldErrors?.[name] ? te(state.fieldErrors[name]!) : null);

  return (
    <>
      {oauthError ? (
        <Notice kind="warning" focusable>
          {oauthError === "INVITE_EMAIL_MISMATCH" ? t("mismatch", { email }) : te("generic")}
        </Notice>
      ) : null}
      <form ref={formRef} action={action} className="form-stack" noValidate>
        {state.error ? (
          <ErrorSummary summaryRef={summaryRef}>
            <Notice kind={state.error === "accountExists" ? "info" : "error"}>
              {te(state.error)}{" "}
              {state.error === "accountExists" ? (
                <Link href="/sign-in" className="link">
                  {t("signIn")}
                </Link>
              ) : null}
            </Notice>
          </ErrorSummary>
        ) : null}
        <div className="field readonly-field">
          <label className="label" htmlFor={emailId}>
            {t("email")}
          </label>
          <p className="help" id={`${emailId}-help`}>
            {t("emailHelp")}
          </p>
          <div className="input-wrap">
            <input
              className="input"
              id={emailId}
              name="email"
              type="email"
              value={email}
              readOnly
              autoComplete="email"
              aria-describedby={`${emailId}-help`}
            />
          </div>
        </div>
        <PasswordField
          name="password"
          label={t("password")}
          help={t("passwordHelp")}
          autoComplete="new-password"
          rules
          error={fe("password")}
        />
        <SubmitButton busyLabel={t("submitting")}>{t("submit")}</SubmitButton>
      </form>
      {googleEnabled ? (
        <>
          <p className="or">
            <span>{t("or")}</span>
          </p>
          {/* A separate form: forms cannot nest, and this one redirects to Google (S-09). */}
          <form action={joinWithGoogleAction}>
            <button type="submit" className="btn btn-secondary btn-block">
              {t("google")}
            </button>
          </form>
        </>
      ) : null}
      <p className="fine fine-terms">
        <span>
          {t.rich("terms", {
            terms: (chunks) => (
              <Link href="/legal/terms" className="link">
                {chunks}
              </Link>
            ),
          })}
        </span>
        <span>
          {t.rich("privacy", {
            privacy: (chunks) => (
              <Link href="/legal/privacy" className="link">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </p>
    </>
  );
}
