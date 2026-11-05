import { defineRouting } from "next-intl/routing";

export const locales = ["hr", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "hr",
  // "/" is Croatian, "/en/..." is English (Master Prompt §2: HR first, EN second).
  localePrefix: "as-needed",
});
