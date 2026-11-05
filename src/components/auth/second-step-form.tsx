"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { secondStepAction, type FormState } from "@/lib/auth/actions";
import { CodeField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

export function SecondStepForm({ returnTo }: { returnTo: string }) {
  const t = useTranslations("auth.secondStep");
  const te = useTranslations("authErrors");
  const [recovery, setRecovery] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(secondStepAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);

  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead text-center">{recovery ? t("leadRecovery") : t("leadTotp")}</p>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="recovery" value={recovery ? "1" : "0"} />
      <CodeField
        key={recovery ? "rec" : "totp"}
        name="code"
        label={recovery ? t("recoveryCode") : t("code")}
        numeric={!recovery}
        error={state.fieldErrors?.code ? te(state.fieldErrors.code) : null}
      />
      <SubmitButton busyLabel={t("submitting")}>{t("submit")}</SubmitButton>
      <button
        type="button"
        className="link link-row"
        onClick={() => {
          setRecovery((r) => !r);
          // The field and the lead change: put the reader on the new field.
          requestAnimationFrame(() => formRef.current?.querySelector("input")?.focus());
        }}
      >
        {recovery ? t("useTotp") : t("useRecovery")}
      </button>
    </form>
  );
}
