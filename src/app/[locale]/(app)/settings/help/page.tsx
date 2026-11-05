import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { BuildingPlaceholder } from "@/components/system/states";
import { IconChevron } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("help") };
}

/** Help, minimal: the useful links; the feedback form (D-078 (5)) arrives in step 5.10. */
export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await memberPage(locale, "/settings/help");
  const t = await getTranslations("nav");
  const tp = await getTranslations("placeholder");
  const ta = await getTranslations("alphaPage");
  const tl = await getTranslations("legal");
  const links = [
    { href: "/about/alpha", label: ta("title") },
    { href: "/legal/guidelines", label: tl("guidelines") },
    { href: "/legal/notice", label: tl("notice") },
  ];
  return (
    <AppShell title={t("help")} backHref="/settings" nav="help" screen="narrow">
      <ul className="set-list">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="set-link">
              <span className="set-txt">
                <span className="set-t">{l.label}</span>
              </span>
              <IconChevron />
            </Link>
          </li>
        ))}
      </ul>
      <BuildingPlaceholder text={tp("help")} />
    </AppShell>
  );
}
