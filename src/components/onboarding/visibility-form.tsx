"use client";

import { useActionState, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/auth/actions";
import { visibilityAction } from "@/lib/onboarding/actions";
import { FieldError } from "@/components/ui/field";
import { IconCheck, IconGlobe, IconLock, IconUsers } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

const ROWS = ["profile", "history", "answers", "followers", "discover", "visitors"] as const;

/**
 * ONB-04 (D-025, D-030, D-034; layout D-060 (1)): two rows of equal weight, nothing pre-selected, one sentence
 * per option, the shared rules said once, the full comparison behind a disclosure. Continue without a choice shows
 * an inline error tied to the group; the button is never disabled (J1 accessibility notes).
 */
export function VisibilityForm({ initial }: { initial: "public" | "private" | null }) {
  const t = useTranslations("join.visibility");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(visibilityAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const id = useId();
  const err = state.fieldErrors?.visibility ? te(state.fieldErrors.visibility) : null;

  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead lead-sm" id={`${id}-help`}>
        {t("lead")}
      </p>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <fieldset
        className="vrows"
        aria-describedby={`${id}-help${err ? ` ${id}-err` : ""}`}
        aria-invalid={err ? true : undefined}
      >
        <legend className="sr-only">{t("legend")}</legend>
        {(["public", "private"] as const).map((v) => (
          <label key={v} className="vrow">
            <input type="radio" name="visibility" value={v} defaultChecked={initial === v} />
            <span className="vrow-head">
              <span className="vis-badge" aria-hidden="true">
                {v === "public" ? <IconGlobe /> : <IconLock />}
              </span>
              <span className="vis-t">{t(v)}</span>
              <span className="vis-mark" aria-hidden="true">
                <IconCheck />
              </span>
            </span>
            <span className="vrow-list">{t(`${v}Line`)}</span>
          </label>
        ))}
      </fieldset>
      {err ? <FieldError id={`${id}-err`} text={err} /> : null}
      <p className="vrow-same">
        <IconUsers />
        <span>{t("same")}</span>
      </p>
      <details className="vrow-more">
        <summary>{t("compare")}</summary>
        <table className="vrow-table">
          <thead>
            <tr>
              <td></td>
              <th scope="col">{t("public")}</th>
              <th scope="col">{t("private")}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r}>
                <th scope="row">{t(`row.${r}`)}</th>
                <td>{t(`row.${r}Public`)}</td>
                <td>{t(`row.${r}Private`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="fine fine-left">{t("fine")}</p>
      <SubmitButton busyLabel={t("submitting")}>{t("next")}</SubmitButton>
    </form>
  );
}

// i18n-keys: join.visibility.public join.visibility.private join.visibility.publicLine join.visibility.privateLine
// i18n-keys: join.visibility.row.profile join.visibility.row.profilePublic join.visibility.row.profilePrivate
// i18n-keys: join.visibility.row.history join.visibility.row.historyPublic join.visibility.row.historyPrivate
// i18n-keys: join.visibility.row.answers join.visibility.row.answersPublic join.visibility.row.answersPrivate
// i18n-keys: join.visibility.row.followers join.visibility.row.followersPublic join.visibility.row.followersPrivate
// i18n-keys: join.visibility.row.discover join.visibility.row.discoverPublic join.visibility.row.discoverPrivate
// i18n-keys: join.visibility.row.visitors join.visibility.row.visitorsPublic join.visibility.row.visitorsPrivate
