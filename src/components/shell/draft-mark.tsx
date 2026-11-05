import { getTranslations } from "next-intl/server";
import { IconWarning } from "@/components/ui/icons";

/** Legal texts are placeholders until counsel has reviewed them (PUB-10, OQ-05). The mark is visible text,
 *  not only colour, and no invitation goes out while it is shown (STATUS, Blockers). */
export async function DraftMark() {
  const t = await getTranslations("legal");
  return (
    <>
      <p className="draft-mark">
        <IconWarning />
        <span>{t("draftMark")}</span>
      </p>
      <p className="meta">{t("draftText")}</p>
    </>
  );
}
