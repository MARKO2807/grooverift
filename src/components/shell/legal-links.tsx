import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// i18n-keys: legal.terms legal.privacy legal.guidelines legal.cookies legal.contact
export const LEGAL_DOCS = ["terms", "privacy", "guidelines", "cookies", "contact"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

/** Legal pages (PUB-10) and the DSA Art. 16 notice form (PUB-11), reachable without an account. */
export async function LegalLinks() {
  const t = await getTranslations("legal");
  return (
    <nav aria-label={t("navLabel")}>
      <ul className="pub-legal">
        {LEGAL_DOCS.map((d) => (
          <li key={d}>
            <Link href={`/legal/${d}`}>{t(d)}</Link>
          </li>
        ))}
        <li>
          <Link href="/legal/notice">{t("notice")}</Link>
        </li>
      </ul>
    </nav>
  );
}
