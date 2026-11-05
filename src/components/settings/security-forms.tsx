"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  acknowledgeBackupCodesAction,
  changePasswordAction,
  disableTwoFactorAction,
  enableTwoFactorAction,
  regenerateBackupCodesAction,
  revokeSessionAction,
  verifyTwoFactorSetupAction,
  type FormState,
  type TwoFactorState,
} from "@/lib/auth/actions";
import { CodeField, PasswordField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import {
  ErrorSummary,
  SubmitButton,
  useFocusRef,
  useFormErrorFocus,
} from "@/components/ui/form-status";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm({ changed = false }: { changed?: boolean }) {
  const t = useTranslations("settings.security");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const fe = (n: string) => (state.fieldErrors?.[n] ? te(state.fieldErrors[n]!) : null);
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead">{t("passwordLead")}</p>
      {changed ? <Notice kind="success">{t("changed")}</Notice> : null}
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <PasswordField
        name="current"
        label={t("current")}
        autoComplete="current-password"
        error={fe("current")}
      />
      <PasswordField
        name="password"
        label={t("new")}
        help={t("newHelp")}
        autoComplete="new-password"
        rules
        error={fe("password")}
      />
      <label className="age-check">
        <input type="checkbox" name="revokeOthers" value="on" defaultChecked />
        <span>{t("revokeOthers")}</span>
      </label>
      <SubmitButton busyLabel={t("changing")}>{t("change")}</SubmitButton>
    </form>
  );
}

/** Recovery codes, shown once after setup (from the server) or after regeneration (from the action). */
export function BackupCodes({ codes }: { codes: string[] }) {
  const t = useTranslations("settings.security");
  const heading = useFocusRef<HTMLHeadingElement>(true);
  return (
    <div className="form-stack">
      <h3 className="set-t" tabIndex={-1} ref={heading}>
        {t("codesTitle")}
      </h3>
      <p className="lead">{t("codesLead")}</p>
      <ul className="code-list">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <form action={acknowledgeBackupCodesAction}>
        <button type="submit" className="btn btn-primary btn-block">
          {t("codesDone")}
        </button>
      </form>
    </div>
  );
}

function PasswordConfirmForm({
  action,
  state,
  label,
  variant,
  help,
}: {
  action: (payload: FormData) => void;
  state: FormState;
  label: string;
  variant: "primary" | "secondary" | "danger";
  help?: string;
}) {
  const t = useTranslations("settings.security");
  const te = useTranslations("authErrors");
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      {help ? <p className="help">{help}</p> : null}
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <PasswordField
        name="password"
        label={t("enterPassword")}
        autoComplete="current-password"
        focusOnMount
        error={state.fieldErrors?.password ? te(state.fieldErrors.password) : null}
      />
      <SubmitButton busyLabel={t("confirming")} variant={variant}>
        {label}
      </SubmitButton>
    </form>
  );
}

export function TwoFactorSection({ enabled, isStaff }: { enabled: boolean; isStaff: boolean }) {
  const t = useTranslations("settings.security");
  const te = useTranslations("authErrors");
  const [enableState, enableAction] = useActionState<TwoFactorState, FormData>(
    enableTwoFactorAction,
    {},
  );
  const [verifyState, verifyAction] = useActionState<TwoFactorState, FormData>(
    verifyTwoFactorSetupAction,
    enableState,
  );
  const [disableState, disableAction] = useActionState<FormState, FormData>(
    disableTwoFactorAction,
    {},
  );
  const [regenState, regenAction] = useActionState<TwoFactorState, FormData>(
    regenerateBackupCodesAction,
    {},
  );
  const [mode, setMode] = useState<"idle" | "enable" | "disable" | "regen">("idle");
  const verifyFormRef = useRef<HTMLFormElement>(null);
  const verifySummaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(verifyState, verifyFormRef, verifySummaryRef);
  const codeFieldWrap = useFocusRef<HTMLDivElement>(enableState.step === "verify");

  const isOn = enabled && !disableState.ok;

  if (regenState.step === "codes" && regenState.backupCodes) {
    return <BackupCodes codes={regenState.backupCodes} />;
  }

  if (enableState.step === "verify") {
    return (
      <form ref={verifyFormRef} action={verifyAction} className="form-stack" noValidate>
        <p className="lead">{t("scanLead")}</p>
        {verifyState.error ? (
          <ErrorSummary summaryRef={verifySummaryRef}>
            <Notice kind="error">{te(verifyState.error)}</Notice>
          </ErrorSummary>
        ) : null}
        {enableState.qrSvg ? (
          <div
            className="qr"
            role="img"
            aria-label={t("qrLabel")}
            dangerouslySetInnerHTML={{ __html: enableState.qrSvg }}
          />
        ) : null}
        <details>
          <summary className="link">{t("manualKey")}</summary>
          <p className="meta" style={{ overflowWrap: "anywhere" }}>
            {enableState.secret}
          </p>
        </details>
        <div ref={codeFieldWrap} tabIndex={-1} className="form-stack">
          <CodeField
            name="code"
            label={t("code")}
            help={t("enterCode")}
            error={verifyState.fieldErrors?.code ? te(verifyState.fieldErrors.code) : null}
          />
        </div>
        <SubmitButton busyLabel={t("confirming")}>{t("confirm")}</SubmitButton>
      </form>
    );
  }

  return (
    <div className="form-stack">
      <p className="lead">{isOn ? t("twoFactorOn") : t("twoFactorOff")}</p>
      {isStaff ? <Notice kind="info">{t("twoFactorStaff")}</Notice> : null}
      {disableState.ok ? <Notice kind="success">{t("disabled")}</Notice> : null}
      {!isOn && mode !== "enable" ? (
        <button type="button" className="btn btn-primary" onClick={() => setMode("enable")}>
          {t("enable")}
        </button>
      ) : null}
      {!isOn && mode === "enable" ? (
        <PasswordConfirmForm
          action={enableAction}
          state={enableState}
          label={t("enable")}
          variant="primary"
        />
      ) : null}
      {isOn ? (
        <div className="foot-row">
          <button type="button" className="btn btn-secondary" onClick={() => setMode("regen")}>
            {t("regenerate")}
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setMode("disable")}>
            {t("disable")}
          </button>
        </div>
      ) : null}
      {isOn && mode === "regen" ? (
        <PasswordConfirmForm
          action={regenAction}
          state={regenState}
          label={t("regenerate")}
          variant="secondary"
          help={t("regenerateHelp")}
        />
      ) : null}
      {isOn && mode === "disable" ? (
        <PasswordConfirmForm
          action={disableAction}
          state={disableState}
          label={t("disable")}
          variant="danger"
        />
      ) : null}
    </div>
  );
}

export type SessionRow = {
  id: string;
  current: boolean;
  device: string;
  lastSeen: string;
};

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const t = useTranslations("settings.security");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(revokeSessionAction, {});
  const toast = useToast();
  useEffect(() => {
    if (state.ok) {
      toast.show(state.values?.all === "1" ? t("revokedAll") : t("revoked"));
      // The revoked row unmounts; focus moves to the section heading (components §3.2).
      document.getElementById("h-sess")?.focus();
    }
  }, [state, toast, t]);
  return (
    <div className="form-stack">
      <p className="lead">{t("sessionsLead")}</p>
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
      <ul className="set-list">
        {sessions.map((s) => (
          <li key={s.id} className="set-row">
            <span className="set-txt">
              <span className="set-t">{s.current ? t("thisDevice") : s.device}</span>
              <span className="set-d">
                {s.current ? s.device : ""} {t("lastSeen", { date: s.lastSeen })}
              </span>
            </span>
            {!s.current ? (
              <form action={action}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  aria-label={`${t("signOutDevice")}: ${s.device}, ${s.lastSeen}`}
                >
                  {t("signOutDevice")}
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {sessions.length > 1 ? (
        <form action={action}>
          <input type="hidden" name="all" value="1" />
          <SubmitButton busyLabel={t("signingOut")} variant="secondary">
            {t("signOutOthers")}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
