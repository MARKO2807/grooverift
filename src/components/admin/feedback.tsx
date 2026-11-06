"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { FEEDBACK_NOTES_MAX } from "@/lib/account/rules";
import { updateFeedbackAction } from "@/lib/admin/feedback-actions";

// i18n-keys: admin.feedback.error.forbidden admin.feedback.error.generic admin.feedback.error.tooMany

/** ADM-15: the team's notes and "Riješeno" / "Vrati u otvorene". */
export function FeedbackTriage({ id, notes, done }: { id: string; notes: string; done: boolean }) {
  const t = useTranslations("admin.feedback");
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState(notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = (nextDone: boolean) =>
    start(async () => {
      setError(null);
      const r = await updateFeedbackAction({ id, notes: text, done: nextDone });
      if (!r.ok) return setError(t(`error.${r.reason}`));
      toast.show(nextDone ? t("closed") : t("reopened"));
      router.refresh();
    });
  return (
    <div className="form-stack">
      <div className="field">
        <label className="label" htmlFor="fb-notes">
          {t("notes")}
        </label>
        <p className="help" id="fb-notes-help">
          {t("notesHelp")}
        </p>
        <textarea
          id="fb-notes"
          className="input textarea"
          rows={4}
          maxLength={FEEDBACK_NOTES_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="fb-notes-help"
        />
      </div>
      {error ? (
        <div role="alert">
          <Notice kind="error">{error}</Notice>
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-primary"
        aria-disabled={pending || undefined}
        onClick={() => !pending && save(!done)}
      >
        {done ? t("reopen") : t("close")}
      </button>
    </div>
  );
}
