import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Wordmark } from "@/components/brand/wordmark";
import { IconChevron } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";

export const dynamic = "force-dynamic";

// i18n-keys: account.about.lic.musicbrainz.name account.about.lic.musicbrainz.text account.about.lic.phosphor.name
// i18n-keys: account.about.lic.phosphor.text account.about.lic.fonts.name account.about.lic.fonts.text

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.about");
  return { title: t("title") };
}

/**
 * "O GrooveRiftu" (D-063 (9)): the wordmark, the alpha, contact and privacy contact, and the licences of what the
 * product is built on (MusicBrainz CC0, Phosphor MIT, Sora and Inter OFL). The legal entity (OQ-05) arrives with
 * counsel's documents; the contact page says so until then.
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await memberPage(locale, "/settings/about");
  const t = await getTranslations("account.about");
  const links = [
    { href: "/about/alpha", title: t("alpha"), text: t("alphaText") },
    { href: "/legal/contact", title: t("contact"), text: t("contactText") },
    { href: "/legal/privacy", title: t("privacy"), text: t("privacyText") },
    { href: "/legal/cookies", title: t("cookies") },
  ];
  const licences = ["musicbrainz", "phosphor", "fonts"] as const;
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      <div className="about-hero">
        <Wordmark />
        <p className="tagline" lang="en">
          Where musical worlds collide.
        </p>
        <p className="meta">{t("version")}</p>
      </div>
      <ul className="set-list">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="set-link">
              <span className="set-txt">
                <span className="set-t">{l.title}</span>
                {l.text ? <span className="set-d">{l.text}</span> : null}
              </span>
              <IconChevron />
            </Link>
          </li>
        ))}
      </ul>
      <section className="set-group" aria-labelledby="h-lic">
        <h2 className="set-gt" id="h-lic">
          {t("licences")}
        </h2>
        <ul className="set-list">
          {licences.map((k) => (
            <li key={k} className="set-row">
              <span className="set-txt">
                <span className="set-t">{t(`lic.${k}.name`)}</span>
                <span className="set-d">{t(`lic.${k}.text`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
