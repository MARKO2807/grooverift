"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/auth/actions";
import { checkUsernameAction, usernameAction, type UsernameCheck } from "@/lib/onboarding/actions";
import { IconCheck, IconWarning } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { FieldError } from "@/components/ui/field";
import { ErrorSummary, SubmitButton, useFormErrorFocus } from "@/components/ui/form-status";

const SHAPE = /^[a-z0-9_]{3,30}$/;

/**
 * ONB-02 (J1 step 4): the display name (D-085: up to three words, as typed) and the @username with a live
 * availability check (WCAG 3.3.2 rules before typing, 3.3.3 suggestions when taken). The server decides again on
 * submit; taken, reserved and recently released read the same (J1 E6).
 */
export function UsernameForm({ initial }: { initial: { displayName: string; username: string } }) {
  const t = useTranslations("join.username");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(usernameAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const nameId = useId();
  const userId = useId();
  const [username, setUsername] = useState(state.values?.username ?? initial.username);
  const [found, setFound] = useState<(UsernameCheck & { for: string }) | null>(null);
  // Once the form is submitted no check is started or shown: the page is about to move on, and a late call would
  // post to a route that does not serve this action.
  const submitted = useRef(false);

  const value = username.trim().toLowerCase();
  const wellFormed = SHAPE.test(value);

  // The live check runs 400 ms after typing stops; the answer names the value it was for, so a late answer for
  // an older value is never shown. A failed call (offline, rate limit) shows nothing: the server decides on submit.
  useEffect(() => {
    if (!wellFormed) return;
    let alive = true;
    const timer = setTimeout(async () => {
      if (submitted.current) return;
      try {
        const res = await checkUsernameAction(value);
        if (alive && !submitted.current) setFound({ ...res, for: value });
      } catch {
        // ignored: the status line stays at "checking" until the member types again or submits
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [value, wellFormed]);

  const fe = (name: string) => (state.fieldErrors?.[name] ? te(state.fieldErrors[name]!) : null);
  const userErr = fe("username");
  const current = found && found.for === value && found.ok ? found : null;
  const status = !value
    ? null
    : !wellFormed
      ? "invalid"
      : current?.state === "free"
        ? "free"
        : current?.state === "taken"
          ? "taken"
          : "checking";

  return (
    <form
      ref={formRef}
      action={action}
      className="form-stack"
      noValidate
      onSubmit={() => {
        submitted.current = true;
      }}
    >
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <div className="field">
        <label className="label" htmlFor={nameId}>
          {t("displayName")}
        </label>
        <p className="help" id={`${nameId}-help`}>
          {t("displayNameHelp")}
        </p>
        <div className="input-wrap">
          <input
            className="input"
            id={nameId}
            name="displayName"
            type="text"
            autoComplete="nickname"
            autoCapitalize="off"
            maxLength={40}
            required
            defaultValue={state.values?.displayName ?? initial.displayName}
            aria-describedby={`${nameId}-help${fe("displayName") ? ` ${nameId}-err` : ""}`}
            aria-invalid={fe("displayName") ? true : undefined}
          />
        </div>
        {fe("displayName") ? <FieldError id={`${nameId}-err`} text={fe("displayName")!} /> : null}
      </div>
      <div className="field">
        <label className="label" htmlFor={userId}>
          {t("username")}
        </label>
        <p className="help" id={`${userId}-help`}>
          {t("usernameHelp")}
        </p>
        <div className="input-wrap has-prefix">
          <span className="prefix" aria-hidden="true">
            @
          </span>
          <input
            className="input"
            id={userId}
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-describedby={`${userId}-help ${userId}-status${userErr ? ` ${userId}-err` : ""}`}
            aria-invalid={userErr ? true : undefined}
          />
        </div>
        {userErr ? <FieldError id={`${userId}-err`} text={userErr} /> : null}
        <div id={`${userId}-status`} aria-live="polite">
          {status === "checking" ? <p className="status-line">{t("checking")}</p> : null}
          {status === "free" ? (
            <p className="status-line ok">
              <IconCheck />
              <span>{t("free", { username: value })}</span>
            </p>
          ) : null}
          {status === "invalid" && !userErr ? (
            <p className="status-line bad">
              <IconWarning />
              <span>{t("invalid")}</span>
            </p>
          ) : null}
          {status === "taken" ? (
            <>
              {!userErr ? (
                <p className="status-line bad">
                  <IconWarning />
                  <span>{t("taken")}</span>
                </p>
              ) : null}
              {current?.suggestions?.length ? (
                <>
                  <p className="help">{t("suggestions")}</p>
                  <div className="chips">
                    {current.suggestions.map((s) => (
                      <button key={s} type="button" className="chip" onClick={() => setUsername(s)}>
                        @{s}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <SubmitButton busyLabel={t("submitting")}>{t("next")}</SubmitButton>
    </form>
  );
}
