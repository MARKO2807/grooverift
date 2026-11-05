import { IconCheckCircle, IconInfo, IconWarning } from "./icons";

type Kind = "info" | "warning" | "error" | "success";

const CLASS: Record<Kind, string> = {
  info: "info",
  warning: "notice",
  error: "post-err",
  success: "ok-line",
};

/** Inline notice: always icon + text + border; the colour only repeats the meaning (components §4.10). */
export function Notice({
  kind = "info",
  children,
  id,
  focusable = false,
  className = "",
}: {
  kind?: Kind;
  children: React.ReactNode;
  id?: string;
  /** Errors on submit receive focus (components §3.2). */
  focusable?: boolean;
  className?: string;
}) {
  const Icon =
    kind === "error" || kind === "warning"
      ? IconWarning
      : kind === "success"
        ? IconCheckCircle
        : IconInfo;
  const role =
    kind === "error" ? "alert" : kind === "success" || kind === "warning" ? "status" : undefined;
  return (
    <div
      className={`${CLASS[kind]} ${className}`}
      role={role}
      id={id}
      tabIndex={focusable ? -1 : undefined}
    >
      <Icon />
      <p>{children}</p>
    </div>
  );
}
