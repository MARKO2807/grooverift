import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DraftMark } from "@/components/shell/draft-mark";
import { LEGAL_DOCS, type LegalDoc } from "@/components/shell/legal-links";
import { PublicShell } from "@/components/shell/public-shell";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// i18n-keys: legal.docs.terms.title legal.docs.terms.lead legal.docs.privacy.title legal.docs.privacy.lead
// i18n-keys: legal.docs.guidelines.title legal.docs.guidelines.lead legal.docs.cookies.title
// i18n-keys: legal.docs.cookies.lead legal.docs.contact.title legal.docs.contact.lead
const isDoc = (d: string): d is LegalDoc => (LEGAL_DOCS as readonly string[]).includes(d);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  if (!isDoc(doc)) return {};
  const t = await getTranslations("legal.docs");
  return { title: t(`${doc}.title`) };
}

/** PUB-10: terms, privacy, guidelines, cookies, contact. Placeholders with a visible draft mark until counsel
 *  (OQ-05, DPIA); each says what the final text will cover, nothing more. */
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  const t = await getTranslations("legal");
  const session = await getSession();
  return (
    <PublicShell screen="legal" signedIn={!!session}>
      <article className="doc">
        <h1 tabIndex={-1}>{t(`docs.${doc}.title`)}</h1>
        <DraftMark />
        <p className="lead">{t(`docs.${doc}.lead`)}</p>
        <p>
          {t("noticeLine")} <Link href="/legal/notice">{t("notice")}</Link>
        </p>
      </article>
    </PublicShell>
  );
}
