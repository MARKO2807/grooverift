import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { FeedbackForm } from "@/components/settings/feedback-form";
import { IconChevron } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.feedback");
  return { title: t("title") };
}

/**
 * SET-12 "Pomoć i povratne informacije" (IA, D-078 (5)): the feedback form first, then the alpha page and the
 * privacy contact; abuse reports go through ⋯ on the answer or profile, never here (Master Prompt §13).
 */
export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/help");
  const t = await getTranslations("account.feedback");
  const links = [
    { href: "/about/alpha", title: t("alpha"), text: t("alphaText") },
    { href: "/legal/privacy", title: t("privacy"), text: t("privacyText") },
    { href: "/legal/guidelines", title: t("guidelines") },
  ];
  return (
    <AppShell title={t("title")} backHref="/settings" nav="help" screen="narrow">
      <FeedbackForm email={session.user.email} />
      <section className="set-group" aria-labelledby="h-more">
        <h2 className="set-gt" id="h-more">
          {t("more")}
        </h2>
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
      </section>
      <p className="meta">{t("abuseNote")}</p>
    </AppShell>
  );
}
