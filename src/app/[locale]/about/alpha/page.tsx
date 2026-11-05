import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DraftMark } from "@/components/shell/draft-mark";
import { PublicShell } from "@/components/shell/public-shell";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("alphaPage");
  return { title: t("title") };
}

/** PUB-12 (Master Prompt §2A.3): known limitations, the feedback channel, data handling and what happens
 *  after the alpha. The carry-over policy is OPEN (OQ-34); the page says only what is certain. */
export default async function AboutAlphaPage() {
  const t = await getTranslations("alphaPage");
  const session = await getSession();
  return (
    <PublicShell screen="alpha" signedIn={!!session}>
      <article className="doc">
        <h1 tabIndex={-1}>{t("title")}</h1>
        <DraftMark />
        <p className="lead">{t("lead")}</p>
        <section aria-labelledby="h-what">
          <h2 id="h-what">{t("whatTitle")}</h2>
          <p>{t("whatText")}</p>
        </section>
        <section aria-labelledby="h-limits">
          <h2 id="h-limits">{t("limitsTitle")}</h2>
          <ul>
            <li>{t("limit1")}</li>
            <li>{t("limit2")}</li>
            <li>{t("limit3")}</li>
          </ul>
        </section>
        <section aria-labelledby="h-feedback" id="feedback">
          <h2 id="h-feedback">{t("feedbackTitle")}</h2>
          <p>{t("feedbackText")}</p>
        </section>
        <section aria-labelledby="h-data">
          <h2 id="h-data">{t("dataTitle")}</h2>
          <p>{t("dataText")}</p>
        </section>
        <section aria-labelledby="h-after">
          <h2 id="h-after">{t("afterTitle")}</h2>
          <p>{t("afterText")}</p>
        </section>
      </article>
    </PublicShell>
  );
}
