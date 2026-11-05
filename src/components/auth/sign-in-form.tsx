"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { signInAction, signInGoogleAction, type FormState } from "@/lib/auth/actions";
import { Link } from "@/i18n/navigation";
import { PasswordField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/form-status";

export function SignInForm({
  returnTo,
  googleEnabled,
  signUpOpen,
  notice,
}: {
  returnTo: string;
  googleEnabled: boolean;
  signUpOpen: boolean;
  notice?: "reset" | "verified";
}) {
  const t = useTranslations("auth.signIn");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);

  const minutes = state.retryAfter ? Math.max(1, Math.ceil(state.retryAfter / 60)) : 15;

  return (
    <form action={action} className="form-stack" noValidate>
      {notice === "reset" ? <Notice kind="success">{t("resetDone")}</Notice> : null}
      {notice === "verified" ? <Notice kind="success">{t("verifiedDone")}</Notice> : null}
      {returnTo !== "/home" ? <Notice kind="info">{t("returnTo")}</Notice> : null}
      {state.error ? (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Notice
            kind={state.error === "locked" || state.error === "lockedReset" ? "warning" : "error"}
          >
            {state.error === "locked" ? te("locked", { minutes }) : te(state.error)}
          </Notice>
        </div>
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
      />
      <PasswordField name="password" label={t("password")} autoComplete="current-password" />
      <Link href="/reset" className="link link-row">
        {t("forgot")}
      </Link>
      <SubmitButton busyLabel={t("submitting")}>{t("submit")}</SubmitButton>
      {googleEnabled ? (
        <>
          <p className="or">
            <span>{t("or")}</span>
          </p>
          <form action={signInGoogleAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button type="submit" className="btn btn-secondary btn-block">
              {t("google")}
            </button>
          </form>
        </>
      ) : null}
      {signUpOpen ? (
        <p className="fine">
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="link">
            {t("signUp")}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
