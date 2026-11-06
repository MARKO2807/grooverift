"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { IconSliders } from "@/components/ui/icons";
import { setReduceMotionAction } from "@/lib/account/actions";

// i18n-keys: account.error.signedOut account.error.tooMany account.error.generic account.error.invalid

/**
 * "Smanji pokrete" under Pristupačnost (D-049, D-063 (9)): a real switch (role="switch") that saves at once; the
 * page then re-renders with <html data-motion> updated. The system setting applies either way.
 */
export function MotionSwitch({ initial }: { initial: boolean }) {
  const t = useTranslations("settingsIndex");
  const te = useTranslations("account.error");
  const toast = useToast();
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const toggle = () => {
    if (pending) return;
    const next = !on;
    setOn(next);
    start(async () => {
      const r = await setReduceMotionAction(next);
      if (!r.ok) {
        setOn(!next);
        toast.show(te(r.reason));
        return;
      }
      document.documentElement.dataset.motion = next ? "reduced" : "full";
      router.refresh();
    });
  };
  return (
    <li className="set-row set-row-switch">
      <span className="set-ic-wrap" aria-hidden="true">
        <IconSliders />
      </span>
      <span className="set-txt">
        <span className="set-t" id="motion-l">
          {t("motion")}
        </span>
        <span className="set-d" id="motion-d">
          {t("motionText")}
        </span>
      </span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={on}
        aria-labelledby="motion-l"
        aria-describedby="motion-d"
        aria-disabled={pending || undefined}
        onClick={toggle}
      >
        <span />
      </button>
    </li>
  );
}
