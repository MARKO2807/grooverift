"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { signOutAction } from "@/lib/auth/actions";

/**
 * "Odjavi se" at the foot of Settings with a short confirmation (D-070 (8): "Odjaviti se? Samo na ovom uređaju.").
 * It moved here from the step 5.1 Home placeholder when Home became the Daily Drop (step 5.7).
 */
export function SignOutButton() {
  const t = useTranslations("settingsIndex");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-secondary sign-out"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {t("signOut")}
      </button>
      <Dialog title={t("signOutTitle")} isOpen={open} onOpenChange={setOpen}>
        {(close) => (
          <form action={signOutAction} className="form-stack">
            <p>{t("signOutText")}</p>
            <div className="foot-row">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button type="submit" className="btn btn-primary">
                {t("signOut")}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
