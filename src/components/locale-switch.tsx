"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { locales } from "@/i18n/routing";

/** The language button from the prototype's top bar (globe icon, D-064): HR ↔ EN, same page. */
export function LocaleSwitch() {
  const locale = useLocale();
  const t = useTranslations("app");
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const next = locales.find((l) => l !== locale) ?? "hr";
  const query = search.toString();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      lang={next}
      aria-label={`${t("language")}: ${next.toUpperCase()}`}
      onClick={() => router.replace(query ? `${pathname}?${query}` : pathname, { locale: next })}
    >
      {next.toUpperCase()}
    </button>
  );
}
