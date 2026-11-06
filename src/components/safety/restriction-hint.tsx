"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IconLock } from "@/components/ui/icons";

export type Restriction = { until: string; noticeId: string };

/**
 * SAFE-07 while browsing (D-075 (5) A): a posting restriction is said where it bites, at the answer dock and the
 * comment form, with the reasons one tap away. Nothing else in the app changes.
 */
export function RestrictionHint({ r, id }: { r: Restriction; id?: string }) {
  const t = useTranslations("safety");
  const f = useFormatter();
  return (
    <p className="rst-hint" id={id}>
      <IconLock />
      <span>
        {t("restricted.hint", {
          date: f.dateTime(new Date(r.until), { day: "numeric", month: "long" }),
        })}{" "}
        <Link href={`/settings/status/notices/${r.noticeId}`} className="link">
          {t("restricted.why")}
        </Link>
      </span>
    </p>
  );
}
