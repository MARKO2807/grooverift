"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { signInAction, signInGoogleAction, type FormState } from "@/lib/auth/actions";
import { Link } from "@/i18n/navigation";
import { PasswordField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

export function SignInForm({
  returnTo,
  googleEnabled,
  notice,
}: {
  returnTo: string;
  googleEnabled: boolean;
  notice?: "reset" | "verified";
}) {
  const t = useTranslations("auth.signIn");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const fe = (n: string) => (state.fieldErrors?.[n] ? te(state.fieldErrors[n]!) : null);
  const minutes = state.retryAfter ? Math.max(1, Math.ceil(state.retryAfter / 60)) : 15;

  return (
    <>
      <form ref={formRef} action={action} className="form-stack" noValidate>
        {notice === "reset" ? <Notice kind="success">{t("resetDone")}</Notice> : null}
        {notice === "verified" ? <Notice kind="success">{t("verifiedDone")}</Notice> : null}
        {returnTo !== "/home" ? <Notice kind="info">{t("returnTo")}</Notice> : null}
        {state.error ? (
          <ErrorSummary summaryRef={summaryRef}>
            <Notice
              kind={state.error === "locked" || state.error === "lockedReset" ? "warning" : "error"}
            >
              {state.error === "locked" ? te("locked", { minutes }) : te(state.error)}
            </Notice>
          </ErrorSummary>
        ) : null}
        <input type="hidden" name="returnTo" value={returnTo} />
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
          autoComplete="current-password"
          error={fe("password")}
        />
        <Link href="/reset" className="link link-row">
          {t("forgot")}
        </Link>
        <SubmitButton busyLabel={t("submitting")}>{t("submit")}</SubmitButton>
      </form>
      {googleEnabled ? (
        <>
          <p className="or">
            <span>{t("or")}</span>
          </p>
          {/* A separate form: forms cannot nest, and this one redirects to Google (S-09). */}
          <form action={signInGoogleAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button type="submit" className="btn btn-secondary btn-block">
              {t("google")}
            </button>
          </form>
        </>
      ) : null}
      <p className="fine">{t("noAccount")}</p>
    </>
  );
}
