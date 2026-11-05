"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "./button";

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
