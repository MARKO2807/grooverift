"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconCheck, IconEye, IconEyeSlash, IconWarning, IconX } from "./icons";
import { passwordMissing, type PasswordRule } from "@/lib/auth/password-policy";

type BaseProps = {
  name: string;
  label: string;
  help?: string;
  error?: string | null;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
};

/** Label above, help and error linked through aria-describedby (components §4.2). */
export function TextField({
  name,
  label,
  help,
  error,
  defaultValue,
  autoComplete,
  required,
  className = "",
  type = "text",
  inputMode,
  ...rest
}: BaseProps & {
  type?: "text" | "email";
  inputMode?: "email" | "text" | "numeric";
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "className">) {
  const id = useId();
  const describedBy = [help ? `${id}-help` : "", error ? `${id}-err` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={`field ${className}`}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {help ? (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      <div className="input-wrap">
        <input
          {...rest}
          className="input"
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          required={required}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? <FieldError id={`${id}-err`} text={error} /> : null}
    </div>
  );
}

export function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <p className="field-err" id={id}>
      <IconWarning />
      <span>{text}</span>
    </p>
  );
}

/** Password field with a "Prikaži / Sakrij" toggle; with `rules`, the D-062 one-line meter for new passwords.
 *  The meter's live region is always in the DOM (empty until typing) so its first text is announced. */
export function PasswordField({
  name,
  label,
  help,
  error,
  autoComplete,
  rules = false,
  focusOnMount = false,
  className = "",
}: BaseProps & { rules?: boolean; focusOnMount?: boolean }) {
  const t = useTranslations("fields");
  const id = useId();
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusOnMount) input.current?.focus();
  }, [focusOnMount]);
  const missing = rules ? passwordMissing(value) : [];
  const showNeed = rules && value.length > 0;
  const describedBy = [
    help ? `${id}-help` : "",
    showNeed ? `${id}-need` : "",
    error ? `${id}-err` : "",
  ]
    .filter(Boolean)
    .join(" ");
  // i18n-keys: fields.pwRule.len fields.pwRule.up fields.pwRule.low fields.pwRule.sym
  const ruleName = (r: PasswordRule) => t(`pwRule.${r}`);
  return (
    <div className={`field ${className}`}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {help ? (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      <div className="input-wrap has-after">
        <input
          ref={input}
          className="input"
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={128}
          onChange={rules ? (e) => setValue(e.target.value) : undefined}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
        />
        {/* The name changes with the state ("Prikaži lozinku" ↔ "Sakrij lozinku"); no aria-pressed on top. */}
        <button
          type="button"
          className="input-btn"
          aria-controls={id}
          aria-label={shown ? t("hidePassword") : t("showPassword")}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <IconEyeSlash /> : <IconEye />}
          <span>{shown ? t("hide") : t("show")}</span>
        </button>
      </div>
      {rules ? (
        <p
          className={`pw-need${missing.length ? "" : " ok"}`}
          id={`${id}-need`}
          aria-live="polite"
          hidden={!showNeed}
        >
          {showNeed ? (
            <>
              {missing.length ? <IconX /> : <IconCheck />}
              <span>
                {missing.length
                  ? t("pwNeed", { rules: missing.map(ruleName).join(", ") })
                  : t("pwOk")}
              </span>
            </>
          ) : null}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-err`} text={error} /> : null}
    </div>
  );
}

/** One-time or recovery code: spaces and hyphens allowed as typed (WCAG 3.3.8), normalised server-side. */
export function CodeField({
  name,
  label,
  help,
  error,
  numeric = true,
  className = "",
}: BaseProps & { numeric?: boolean }) {
  const id = useId();
  const describedBy = [help ? `${id}-help` : "", error ? `${id}-err` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={`field tfa-field ${className}`}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {help ? (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      <div className="input-wrap">
        <input
          className="input"
          id={id}
          name={name}
          type="text"
          inputMode={numeric ? "numeric" : "text"}
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={numeric ? 9 : 16}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? <FieldError id={`${id}-err`} text={error} /> : null}
    </div>
  );
}
