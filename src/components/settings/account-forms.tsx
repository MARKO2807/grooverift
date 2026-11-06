"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { linkGoogleAction, unlinkGoogleAction } from "@/lib/account/actions";
import { changeEmailAction, type FormState } from "@/lib/auth/actions";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

export function ChangeEmailForm({ current }: { current: string }) {
  const t = useTranslations("settings.account");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(changeEmailAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead">{t("emailLead")}</p>
      <p className="meta">
        {t("email")}: {current}
      </p>
      {state.ok ? <Notice kind="success">{t("sent")}</Notice> : null}
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <TextField
        name="email"
        label={t("newEmail")}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email ? te(state.fieldErrors.email) : null}
      />
      <SubmitButton busyLabel={t("changing")} variant="secondary">
        {t("change")}
      </SubmitButton>
    </form>
  );
}

// i18n-keys: account.error.signedOut account.error.notAllowed account.error.state account.error.generic

/**
 * SET-02 Google sign-in (S-09: Better Auth links only a Google account with the same, verified address). Linking
 * leaves for Google and comes back; unlinking is offered only while a password remains, so the member always
 * keeps a way in.
 */
export function GoogleRow({ linked, canUnlink }: { linked: boolean; canUnlink: boolean }) {
  const t = useTranslations("account.google");
  const te = useTranslations("account.error");
  const [isLinked, setLinked] = useState(linked);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="form-stack">
      <p className="meta" aria-live="polite">
        {isLinked ? t("linked") : t("notLinked")}
      </p>
      {error ? (
        <div role="alert">
          <Notice kind="error">{error}</Notice>
        </div>
      ) : null}
      {isLinked ? (
        canUnlink ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: "flex-start" }}
            aria-disabled={pending || undefined}
            onClick={() =>
              !pending &&
              start(async () => {
                const r = await unlinkGoogleAction();
                if (r.ok) setLinked(false);
                else setError(te(r.reason));
              })
            }
          >
            {t("unlink")}
          </button>
        ) : (
          <p className="help">{t("onlyWay")}</p>
        )
      ) : (
        <form action={linkGoogleAction}>
          <button type="submit" className="btn btn-secondary btn-sm">
            {t("link")}
          </button>
        </form>
      )}
    </div>
  );
}
