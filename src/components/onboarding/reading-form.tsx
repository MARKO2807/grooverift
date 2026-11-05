"use client";

import { useActionState, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/auth/actions";
import { readingAction } from "@/lib/onboarding/actions";
import { IconCheck } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

const LANGS = [
  { code: "hr", label: "Hrvatski" },
  { code: "en", label: "English" },
] as const;

/** ONB-03 (J1 step 5): the optional reading languages as toggle chips (checkboxes); nothing is hidden by them. */
export function ReadingForm({ initial }: { initial: string[] }) {
  const t = useTranslations("join.reading");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(readingAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const id = useId();
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <fieldset className="group choices" aria-describedby={`${id}-help`}>
        <legend className="sr-only">{t("legend")}</legend>
        <p className="help" id={`${id}-help`}>
          <span className="opt">{t("optional")}</span> {t("help")}
        </p>
        <div className="chips">
          {LANGS.map((l) => (
            <label key={l.code} className="chip chip-toggle" lang={l.code}>
              <input
                type="checkbox"
                name="reading"
                value={l.code}
                defaultChecked={initial.includes(l.code)}
              />
              <span className="ck" aria-hidden="true">
                <IconCheck />
              </span>
              {l.label}
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton busyLabel={t("submitting")}>{t("next")}</SubmitButton>
    </form>
  );
}
