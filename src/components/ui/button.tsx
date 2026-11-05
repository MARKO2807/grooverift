"use client";

import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";

export type ButtonProps = AriaButtonProps & {
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "sm" | "cta";
  block?: boolean;
  /** Busy: the label changes to `busyLabel`, the button takes aria-disabled and stays focusable (§3.1). */
  busy?: boolean;
  busyLabel?: string;
  className?: string;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: Pick<ButtonProps, "variant" | "size" | "block" | "className">) {
  return [
    "btn",
    `btn-${variant}`,
    size === "sm" && "btn-sm",
    size === "cta" && "btn-cta",
    block && "btn-block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant,
  size,
  block,
  busy,
  busyLabel,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <AriaButton
      {...rest}
      className={buttonClass({ variant, size, block, className })}
      aria-disabled={busy || undefined}
      onPress={busy ? undefined : rest.onPress}
    >
      {busy && busyLabel ? busyLabel : children}
    </AriaButton>
  );
}
