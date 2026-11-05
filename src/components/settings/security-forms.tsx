"use client";

import { useActionState, useEffect, useState } from "react";
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
import { SubmitButton } from "@/components/ui/form-status";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm({ changed = false }: { changed?: boolean }) {
  const t = useTranslations("settings.security");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  const fe = (n: string) => (state.fieldErrors?.[n] ? te(state.fieldErrors[n]!) : null);
  return (
    <form action={action} className="form-stack" noValidate>
      <p className="lead">{t("passwordLead")}</p>
      {changed ? <Notice kind="success">{t("changed")}</Notice> : null}
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
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
      {/* An unticked box posts nothing; "off" tells the action the member chose to keep other devices. */}
      <SubmitButton busyLabel={t("changing")}>{t("change")}</SubmitButton>
    </form>
  );
}

/** Recovery codes, shown once after setup (from the server) or after regeneration (from the action). */
export function BackupCodes({ codes }: { codes: string[] }) {
  const t = useTranslations("settings.security");
  return (
    <div className="form-stack">
      <h3 className="set-t">{t("codesTitle")}</h3>
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
  const fe = (s: FormState, n: string) => (s.fieldErrors?.[n] ? te(s.fieldErrors[n]!) : null);

  const isOn = enabled && !disableState.ok;

  if (regenState.step === "codes" && regenState.backupCodes) {
    return <BackupCodes codes={regenState.backupCodes} />;
  }

  if (enableState.step === "verify") {
    return (
      <form action={verifyAction} className="form-stack" noValidate>
        <p className="lead">{t("scanLead")}</p>
        {enableState.qrSvg ? (
          <div
            className="qr"
            role="img"
            aria-label={t("manualKey")}
            dangerouslySetInnerHTML={{ __html: enableState.qrSvg }}
          />
        ) : null}
        <details>
          <summary className="link">{t("manualKey")}</summary>
          <p className="meta" style={{ overflowWrap: "anywhere" }}>
            {enableState.secret}
          </p>
        </details>
        <CodeField
          name="code"
          label={t("code")}
          help={t("enterCode")}
          error={fe(verifyState, "code")}
        />
        {verifyState.error ? <Notice kind="error">{te(verifyState.error)}</Notice> : null}
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
        <form action={enableAction} className="form-stack" noValidate>
          {enableState.error ? <Notice kind="error">{te(enableState.error)}</Notice> : null}
          <PasswordField
            name="password"
            label={t("enterPassword")}
            autoComplete="current-password"
            error={fe(enableState, "password")}
          />
          <SubmitButton busyLabel={t("confirming")}>{t("enable")}</SubmitButton>
        </form>
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
        <form action={regenAction} className="form-stack" noValidate>
          <p className="help">{t("regenerateHelp")}</p>
          {regenState.error ? <Notice kind="error">{te(regenState.error)}</Notice> : null}
          <PasswordField
            name="password"
            label={t("enterPassword")}
            autoComplete="current-password"
            error={fe(regenState, "password")}
          />
          <SubmitButton busyLabel={t("confirming")} variant="secondary">
            {t("regenerate")}
          </SubmitButton>
        </form>
      ) : null}
      {isOn && mode === "disable" ? (
        <form action={disableAction} className="form-stack" noValidate>
          {disableState.error ? <Notice kind="error">{te(disableState.error)}</Notice> : null}
          <PasswordField
            name="password"
            label={t("enterPassword")}
            autoComplete="current-password"
            error={fe(disableState, "password")}
          />
          <SubmitButton busyLabel={t("confirming")} variant="danger">
            {t("disable")}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

export type SessionRow = {
  token: string;
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
    if (state.ok) toast.show(state.values?.all === "1" ? t("revokedAll") : t("revoked"));
  }, [state, toast, t]);
  return (
    <div className="form-stack">
      <p className="lead">{t("sessionsLead")}</p>
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
      <ul className="set-list">
        {sessions.map((s) => (
          <li key={s.token} className="set-row">
            <span className="set-txt">
              <span className="set-t">{s.current ? t("thisDevice") : s.device}</span>
              <span className="set-d">
                {s.current ? s.device : ""} {t("lastSeen", { date: s.lastSeen })}
              </span>
            </span>
            {!s.current ? (
              <form action={action}>
                <input type="hidden" name="token" value={s.token} />
                <SubmitButton busyLabel="…" variant="secondary" block={false} className="btn-sm">
                  {t("signOutDevice")}
                </SubmitButton>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {sessions.length > 1 ? (
        <form action={action}>
          <input type="hidden" name="all" value="1" />
          <SubmitButton busyLabel="…" variant="secondary">
            {t("signOutOthers")}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
