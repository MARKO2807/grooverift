"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { locales } from "@/i18n/routing";

/** The language button from the prototype's top bar (D-064): HR ↔ EN, same page. The visible code
 *  is part of the accessible name (WCAG 2.5.3) and the name stays in the page's language; no `lang`
 *  on the button, so the page's voice reads it (WCAG 3.1.2). */
export function LocaleSwitch() {
  const locale = useLocale();
  const t = useTranslations("app");
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const next = locales.find((l) => l !== locale) ?? "hr";
  const query = search.toString();
  const code = next.toUpperCase();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      aria-label={`${t("language")}: ${code}`}
      onClick={() => router.replace(query ? `${pathname}?${query}` : pathname, { locale: next })}
    >
      {code}
    </button>
  );
}
