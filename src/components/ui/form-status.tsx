"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "./button";
import type { FormState } from "@/lib/auth/actions";

/** Submit button for server-action forms: stays a real <button type="submit"> (components §4.2, Phase 4 rule),
 *  announces the pending label and takes aria-disabled while the action runs (§3.1 busy state). */
export function SubmitButton({
  children,
  busyLabel,
  variant = "primary",
  block = true,
  className,
}: {
  children: React.ReactNode;
  busyLabel: string;
  variant?: "primary" | "secondary" | "danger";
  block?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={buttonClass({ variant, block, className })}
      aria-disabled={pending || undefined}
      onClick={pending ? (e) => e.preventDefault() : undefined}
    >
      {pending ? busyLabel : children}
    </button>
  );
}

/** Errors on submit (components §3.2, WCAG 3.3.1): focus moves to the error summary when there is one,
 *  otherwise to the first invalid field, whose aria-describedby then reads the error. */
export function useFormErrorFocus(
  state: FormState,
  formRef: RefObject<HTMLFormElement | null>,
  summaryRef?: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (state.error && summaryRef?.current) {
      summaryRef.current.focus();
      return;
    }
    if (state.error || state.fieldErrors) {
      const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      (invalid ?? summaryRef?.current)?.focus();
    }
  }, [state, formRef, summaryRef]);
}

/** A focus target for the error summary: the Amber ring shows on it like on every other stop. */
export function ErrorSummary({
  children,
  summaryRef,
}: {
  children: React.ReactNode;
  summaryRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={summaryRef} tabIndex={-1} className="rounded-[var(--gr-radius-card)]">
      {children}
    </div>
  );
}

export function useFocusRef<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}
