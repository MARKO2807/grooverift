"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SORTS, type Sort } from "@/lib/drop/rules";

// The three sorts (plan §1.2, J3 accessibility: a native radio group, not a custom dropdown). Choosing one
// replaces the URL's ?sort= so the order survives a reload and the back button; the scroll position stays. The
// radios are uncontrolled (the choice shows at once) and reset from the URL when the page answers.

// i18n-keys: drop.sort.foryou drop.sort.recent drop.sort.discussed

export function SortControl({ value }: { value: Sort }) {
  const t = useTranslations("drop");
  const router = useRouter();
  const pathname = usePathname();
  return (
    <fieldset className="sort" key={value}>
      <legend className="sr-only">{t("sortLegend")}</legend>
      {SORTS.map((s) => (
        <label key={s}>
          <input
            type="radio"
            name="sort"
            value={s}
            defaultChecked={value === s}
            onChange={() =>
              router.replace(s === "foryou" ? pathname : `${pathname}?sort=${s}`, { scroll: false })
            }
          />
          <span>{t(`sort.${s}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}
