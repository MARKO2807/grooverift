"use client";

import { useTranslations } from "next-intl";
import { IconShare } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";

/** Share the question (J3): the system share sheet where there is one, else the link is copied. Signed-out
 *  visitors who open it see the question and the invitation only (D-022). */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const t = useTranslations("drop");
  const toast = useToast();
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url, title });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.show(t("linkCopied"));
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.show(t("linkFailed", { url }));
    }
  };
  return (
    <button type="button" className="iconbtn" aria-label={t("shareQuestion")} onClick={share}>
      <IconShare />
    </button>
  );
}
