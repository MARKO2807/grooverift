"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Notice } from "@/components/ui/notice";
import { restoreAccountAction } from "@/lib/account/actions";

// i18n-keys: account.error.state

/** "Vrati račun" (SET-09 grace period): cancels the deletion and opens Home with the account as it was. */
export function RestoreButton() {
  const t = useTranslations("account.pending");
  const te = useTranslations("account.error");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        aria-disabled={pending || undefined}
        onClick={() =>
          !pending &&
          start(async () => {
            const r = await restoreAccountAction();
            if (!r.ok) setFailed(true);
          })
        }
      >
        {pending ? t("restoring") : t("restore")}
      </button>
      {failed ? (
        <div role="alert" className="w-full">
          <Notice kind="error">{te("state")}</Notice>
        </div>
      ) : null}
    </>
  );
}
