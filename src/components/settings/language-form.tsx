"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { IconCheck } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import {
  setLanguageAction,
  setReadingLanguagesAction,
  setTimeZoneAction,
} from "@/lib/account/actions";

// i18n-keys: account.error.signedOut account.error.tooMany account.error.generic account.error.invalid

const LANGS = [
  { code: "hr", label: "Hrvatski" },
  { code: "en", label: "English" },
] as const;

/**
 * SET-07 (IA): interface language, reading languages and the time zone. Each choice saves at once and says so
 * (WCAG 4.1.3 through the toast); the interface language reloads the page in that language.
 */
export function LanguageForm({
  locale,
  reading,
  timeZone,
  zones,
}: {
  locale: "hr" | "en";
  reading: string[];
  timeZone: string;
  zones: string[];
}) {
  const t = useTranslations("account.language");
  const te = useTranslations("account.error");
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [langs, setLangs] = useState(reading);
  const [zone, setZone] = useState(timeZone);
  const [pending, start] = useTransition();

  const saveLocale = (next: "hr" | "en") =>
    start(async () => {
      const r = await setLanguageAction(next);
      if (!r.ok) return toast.show(te(r.reason));
      router.replace(pathname, { locale: next });
    });
  const toggleReading = (code: string) => {
    const next = langs.includes(code) ? langs.filter((l) => l !== code) : [...langs, code];
    setLangs(next);
    start(async () => {
      const r = await setReadingLanguagesAction(next);
      if (!r.ok) {
        setLangs(langs);
        return toast.show(te(r.reason));
      }
      toast.show(t("saved"));
    });
  };
  const saveZone = (tz: string) => {
    const before = zone;
    setZone(tz);
    start(async () => {
      const r = await setTimeZoneAction(tz);
      if (!r.ok) {
        setZone(before);
        return toast.show(te(r.reason));
      }
      toast.show(t("saved"));
    });
  };

  return (
    <div className="form-stack" aria-busy={pending || undefined}>
      <fieldset className="choices">
        <legend>{t("interface")}</legend>
        {LANGS.map((l) => (
          <label key={l.code} className="choice">
            <input
              type="radio"
              name="locale"
              value={l.code}
              checked={locale === l.code}
              onChange={() => saveLocale(l.code)}
            />
            <span className="choice-mark" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="choice-body">
              <span className="choice-title" lang={l.code}>
                {l.label}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="group choices" aria-describedby="reading-help">
        <legend>{t("reading")}</legend>
        <p className="help" id="reading-help">
          {t("readingHelp")}
        </p>
        <div className="chips">
          {LANGS.map((l) => (
            <label key={l.code} className="chip chip-toggle" lang={l.code}>
              <input
                type="checkbox"
                name="reading"
                value={l.code}
                checked={langs.includes(l.code)}
                onChange={() => toggleReading(l.code)}
              />
              <span className="ck" aria-hidden="true">
                <IconCheck />
              </span>
              {l.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="label" htmlFor="f-tz">
          {t("zone")}
        </label>
        <p className="help" id="f-tz-help">
          {t("zoneHelp")}
        </p>
        <select
          id="f-tz"
          className="select"
          value={zone}
          aria-describedby="f-tz-help"
          onChange={(e) => saveZone(e.target.value)}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
