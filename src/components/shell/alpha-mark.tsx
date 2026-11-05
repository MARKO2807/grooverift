import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** SYS-05: a persistent, unobtrusive "Alfa" label linking to "About the alpha" (PUB-12, Master Prompt §2A.3).
 *  The visible word starts the accessible name (WCAG 2.5.3). */
export async function AlphaMark() {
  const t = await getTranslations("app");
  return (
    <Link href="/about/alpha" className="alpha-tag" aria-label={t("alphaMarkLabel")}>
      {t("alphaMark")}
    </Link>
  );
}
