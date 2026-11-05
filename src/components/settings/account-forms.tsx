"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changeEmailAction, type FormState } from "@/lib/auth/actions";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/form-status";

export function ChangeEmailForm({ current }: { current: string }) {
  const t = useTranslations("settings.account");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(changeEmailAction, {});
  return (
    <form action={action} className="form-stack" noValidate>
      <p className="lead">{t("emailLead")}</p>
      <p className="meta">
        {t("email")}: {current}
      </p>
      {state.ok ? <Notice kind="success">{t("sent")}</Notice> : null}
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
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
