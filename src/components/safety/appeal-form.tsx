"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { IconWarning } from "@/components/ui/icons";
import { appealAction, type SafetyFailure } from "@/lib/safety/actions";
import { APPEAL_MAX } from "@/lib/moderation/rules";

/**
 * SAFE-06, a basic appeal (D-075): one text, reviewed by another person where possible; the decision stays in force
 * meanwhile. The text is kept when sending fails (JR4). Works on the SAFE-07 suspension screen too (DSA Art. 20).
 */
export function AppealForm({ actionId }: { actionId: string }) {
  const t = useTranslations("safety");
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<SafetyFailure | "empty" | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const done = useRef<HTMLParagraphElement>(null);
  const length = text.trim().length;
  const over = length > APPEAL_MAX;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!length) return setError("empty");
    if (over) return setError("invalid");
    start(async () => {
      const r = await appealAction(actionId, text);
      if (r.ok) {
        setSent(true);
        setError(null);
        requestAnimationFrame(() => done.current?.focus());
        router.refresh();
      } else setError(r.reason);
    });
  };

  if (sent)
    return (
      <p className="sor-sent" ref={done} tabIndex={-1} role="status">
        {t("appeal.sent")}
      </p>
    );

  return (
    <form className="form-stack appeal" onSubmit={submit} noValidate>
      <div className="field">
        <label className="label" htmlFor={`${id}-a`}>
          {t("appeal.label")}
        </label>
        <textarea
          id={`${id}-a`}
          className="textarea"
          rows={5}
          value={text}
          aria-invalid={error === "empty" || over || undefined}
          aria-describedby={`${id}-h ${id}-n${error ? ` ${id}-e` : ""}`}
          onChange={(e) => setText(e.target.value)}
        />
        <p className={`char-count${over ? " is-over" : ""}`} id={`${id}-n`}>
          {t("report.chars", { count: length, max: APPEAL_MAX })}
        </p>
        <p className="help" id={`${id}-h`}>
          {t("appeal.help")}
        </p>
      </div>
      {error ? (
        <div className="post-err" role="alert" id={`${id}-e`}>
          <IconWarning />
          <p>{error === "empty" ? t("appeal.empty") : t(`error.${error}`)}</p>
        </div>
      ) : null}
      <button
        type="submit"
        className="btn btn-primary"
        aria-disabled={pending || undefined}
        disabled={pending}
      >
        {error === "generic" ? t("report.retry") : t("appeal.send")}
      </button>
    </form>
  );
}
