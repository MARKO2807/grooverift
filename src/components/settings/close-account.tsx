"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { FieldError, PasswordField } from "@/components/ui/field";
import { IconCheck, IconDatabase, IconTrash } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import {
  closeAccountAction,
  exportStatusAction,
  reauthAction,
  requestExportAction,
  type AccountFailure,
} from "@/lib/account/actions";
import type { ExportView } from "@/lib/account/export-view";
import type { DeleteChoice } from "@/lib/account/rules";

// i18n-keys: account.error.signedOut account.error.notAllowed account.error.tooMany account.error.generic
// i18n-keys: account.error.wrongPassword account.error.required account.error.staff account.error.state
// i18n-keys: account.error.reauth account.error.invalid
// i18n-keys: account.close.deactivate.title account.close.deactivate.desc account.close.delete.title
// i18n-keys: account.close.delete.desc account.close.deactivate.go account.close.delete.go
// i18n-keys: account.close.deactivate.f1 account.close.deactivate.f2 account.close.deactivate.f3
// i18n-keys: account.close.delete.f1 account.close.delete.f2 account.close.delete.f3 account.close.delete.f4

type Step = "choose" | "copy" | "confirm";

/**
 * SET-09 (D-070 (7), sketch B): short steps. Choose (nothing pre-selected) → the data copy (download or skip,
 * D-066) → what happens plus the password → the closed screen. Each step moves focus to its heading. The copy is
 * built on the server; this step polls until it is ready and then offers the ZIP.
 */
export function CloseAccountFlow({
  deleteDate,
  hasPassword,
  fresh,
  initialCopy,
}: {
  /** The deletion day, already formatted ("6. prosinca"). */
  deleteDate: string;
  hasPassword: boolean;
  /** A Google-only member signed in within 15 minutes (the confirmation without a password). */
  fresh: boolean;
  initialCopy: ExportView;
}) {
  const t = useTranslations("account.close");
  const te = useTranslations("account.error");
  const [step, setStep] = useState<Step>("choose");
  const [choice, setChoice] = useState<DeleteChoice | null>(null);
  const [chooseError, setChooseError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const total = choice === "delete" ? 3 : 2;
  const progress = (n: number) => <p className="progress-text">{t("progress", { n, total })}</p>;

  if (step === "choose")
    return (
      <form
        className="close-flow"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!choice) return setChooseError(true);
          setStep("copy");
        }}
      >
        <fieldset
          className="choices"
          aria-describedby={chooseError ? "close-choose-err" : undefined}
          aria-invalid={chooseError || undefined}
        >
          <legend>
            <h2 className="sub-h" ref={heading} tabIndex={-1}>
              {t("chooseTitle")}
            </h2>
          </legend>
          {(["deactivate", "delete"] as const).map((v) => (
            <label key={v} className="choice">
              <input
                type="radio"
                name="choice"
                value={v}
                checked={choice === v}
                onChange={() => {
                  setChoice(v);
                  setChooseError(false);
                }}
              />
              <span className="choice-mark" aria-hidden="true">
                <IconCheck />
              </span>
              <span className="choice-body">
                <span className="choice-title">{t(`${v}.title`)}</span>
                <span className="choice-desc">{t(`${v}.desc`, { date: deleteDate })}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {chooseError ? <FieldError id="close-choose-err" text={t("chooseError")} /> : null}
        <button type="submit" className="btn btn-primary btn-block">
          {t("next")}
        </button>
      </form>
    );

  if (step === "copy")
    return (
      <div className="close-flow">
        {progress(1)}
        <div className="sub-step">
          <span className="step-ic" aria-hidden="true">
            <IconDatabase />
          </span>
          <h2 className="sub-h" ref={heading} tabIndex={-1}>
            {t("copyTitle")}
          </h2>
          <p className="help">{t("copyText")}</p>
        </div>
        <DataCopy initial={initialCopy} />
        <div className="foot-row equal">
          <button type="button" className="btn btn-secondary" onClick={() => setStep("choose")}>
            {t("back")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setStep("confirm")}>
            {t("next")}
          </button>
        </div>
      </div>
    );

  return (
    <Confirm
      choice={choice!}
      deleteDate={deleteDate}
      hasPassword={hasPassword}
      fresh={fresh}
      progress={progress(2)}
      headingRef={heading}
      onBack={() => setStep("copy")}
      te={te}
    />
  );
}

function Confirm({
  choice,
  deleteDate,
  hasPassword,
  fresh,
  progress,
  headingRef,
  onBack,
  te,
}: {
  choice: DeleteChoice;
  deleteDate: string;
  hasPassword: boolean;
  fresh: boolean;
  progress: React.ReactNode;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  te: (key: AccountFailure) => string;
}) {
  const t = useTranslations("account.close");
  const [error, setError] = useState<AccountFailure | null>(null);
  const [pending, start] = useTransition();
  const facts = choice === "delete" ? ["f1", "f2", "f3", "f4"] : ["f1", "f2", "f3"];
  const fieldError = error === "wrongPassword" || error === "required";
  const canConfirm = hasPassword || fresh;
  return (
    <form
      className="close-flow"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const password = String(new FormData(e.currentTarget).get("password") ?? "");
        start(async () => {
          const r = await closeAccountAction({ choice, password });
          // Success redirects to the closed screen; only failures come back.
          if (!r.ok) setError(r.reason);
        });
      }}
    >
      {progress}
      <h2 className="sub-h" ref={headingRef} tabIndex={-1}>
        {choice === "delete"
          ? t("delete.confirmTitle", { date: deleteDate })
          : t("deactivate.confirmTitle")}
      </h2>
      <ul className="sub-facts">
        {facts.map((k) => (
          <li key={k}>{t(`${choice}.${k}`, { date: deleteDate })}</li>
        ))}
      </ul>
      {error && !fieldError ? (
        <div role="alert">
          <Notice kind="error">{te(error)}</Notice>
        </div>
      ) : null}
      {hasPassword ? (
        <PasswordField
          name="password"
          label={t("password")}
          autoComplete="current-password"
          error={fieldError ? te(error!) : null}
        />
      ) : fresh ? (
        <p className="help">{t("freshNote")}</p>
      ) : (
        <div className="form-stack">
          <p className="help">{t("reauthNote")}</p>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => reauthAction()}
          >
            {t("reauth")}
          </button>
        </div>
      )}
      <div className="foot-row equal">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t("back")}
        </button>
        {canConfirm ? (
          <button type="submit" className="btn btn-danger" aria-disabled={pending || undefined}>
            {choice === "delete" ? <IconTrash /> : null}
            {pending ? t("working") : t(`${choice}.go`)}
          </button>
        ) : null}
      </div>
    </form>
  );
}

const POLL_MS = 3000;

/** "Preuzmi kopiju": asks once, then polls until the ZIP is ready (or offers to ask again after a failure). */
export function DataCopy({ initial }: { initial: ExportView }) {
  const t = useTranslations("account.copy");
  const te = useTranslations("account.error");
  const [view, setView] = useState(initial);
  const [error, setError] = useState<AccountFailure | null>(null);
  const [pending, start] = useTransition();
  const waiting = view.status === "requested" || view.status === "building";
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(async () => {
      const next = await exportStatusAction();
      if (next) setView(next);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [waiting]);
  const ask = () =>
    start(async () => {
      setError(null);
      const r = await requestExportAction();
      if (r.ok) setView(r.view);
      else setError(r.reason);
    });
  const kb = view.sizeBytes ? Math.max(1, Math.round(view.sizeBytes / 1024)) : null;
  return (
    <div className="form-stack">
      <div aria-live="polite" className="form-stack">
        {view.status === "ready" && view.href ? (
          <div className="copy-ready">
            <span className="set-txt">
              <span className="set-t">{t("ready")}</span>
              <span className="set-d">{t("readyText", { kb: kb ?? 1 })}</span>
            </span>
            {/* A plain link: the browser downloads the ZIP (Content-Disposition), no script involved. */}
            <a className="btn btn-secondary btn-sm" href={view.href} download>
              {t("download")}
            </a>
          </div>
        ) : waiting ? (
          <p className="status-line">{t("preparing")}</p>
        ) : view.status === "failed" ? (
          <Notice kind="error">{t("failed")}</Notice>
        ) : null}
        {error ? <Notice kind="error">{te(error)}</Notice> : null}
      </div>
      {view.status === "none" || view.status === "failed" ? (
        <button
          type="button"
          className="btn btn-secondary btn-block"
          aria-disabled={pending || undefined}
          onClick={() => !pending && ask()}
        >
          {pending ? t("asking") : t("ask")}
        </button>
      ) : null}
    </div>
  );
}
