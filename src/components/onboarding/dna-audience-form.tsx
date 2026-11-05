"use client";

import { useActionState, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/auth/actions";
import { dnaAudienceAction } from "@/lib/onboarding/actions";
import { FieldError } from "@/components/ui/field";
import { IconCheck, IconLock, IconUser, IconUsers } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";
import { DNA_AUDIENCES, type DnaAudience } from "@/lib/music/limits";

const ICON: Record<DnaAudience, React.ComponentType> = {
  everyone: IconUsers,
  followers: IconUser,
  me: IconLock,
};

/** ONB-06 (D-024, D-030, D-034): who sees the Music DNA; nothing pre-selected, equal weight, factual lines. */
export function DnaAudienceForm({ initial }: { initial: DnaAudience | null }) {
  const t = useTranslations("join.dnaAudience");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(dnaAudienceAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const id = useId();
  const err = state.fieldErrors?.audience ? te(state.fieldErrors.audience) : null;
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <fieldset
        className="choices"
        aria-describedby={err ? `${id}-err` : undefined}
        aria-invalid={err ? true : undefined}
      >
        <legend>{t("legend")}</legend>
        {DNA_AUDIENCES.map((a) => {
          const Icon = ICON[a];
          return (
            <label key={a} className="choice">
              <input type="radio" name="audience" value={a} defaultChecked={initial === a} />
              <span className="choice-mark" aria-hidden="true">
                <IconCheck />
              </span>
              <span className="choice-body">
                <span className="choice-title choice-title-row">
                  <Icon />
                  <span>{t(`${a}.title`)}</span>
                </span>
                <span className="choice-desc">{t(`${a}.desc`)}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {err ? <FieldError id={`${id}-err`} text={err} /> : null}
      <SubmitButton busyLabel={t("submitting")}>{t("next")}</SubmitButton>
    </form>
  );
}

// i18n-keys: join.dnaAudience.everyone.title join.dnaAudience.everyone.desc join.dnaAudience.followers.title
// i18n-keys: join.dnaAudience.followers.desc join.dnaAudience.me.title join.dnaAudience.me.desc
