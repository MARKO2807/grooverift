"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { acknowledgeRestrictionAction } from "@/lib/safety/actions";

/** "Nastavi" on the SAFE-07 restriction screen: marks it seen and goes where the member was heading. */
export function ContinueButton({ actionId, returnTo }: { actionId: string; returnTo: string }) {
  const t = useTranslations("safety.hold");
  const te = useTranslations("safety.error");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      aria-disabled={pending || undefined}
      onClick={() =>
        !pending &&
        start(async () => {
          const r = await acknowledgeRestrictionAction(actionId);
          if (r.ok) router.replace(returnTo);
          else toast.show(te(r.reason));
        })
      }
    >
      {t("continue")}
    </button>
  );
}
