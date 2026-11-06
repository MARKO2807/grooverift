import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** The three views of moderation (ADM-10 open and decided, ADM-11 appeals) with their counts. */
export async function ModerationTabs({
  current,
  counts,
}: {
  current: "open" | "closed" | "appeals";
  counts: { open: number; urgent: number; appeals: number };
}) {
  const t = await getTranslations("moderation.tabs");
  const tabs = [
    { key: "open", href: "/admin/moderation", label: t("open", { count: counts.open }) },
    { key: "closed", href: "/admin/moderation?view=closed", label: t("closed") },
    {
      key: "appeals",
      href: "/admin/moderation/appeals",
      label: t("appeals", { count: counts.appeals }),
    },
  ] as const;
  return (
    <nav aria-label={t("label")} className="foot-row mod-tabs">
      {tabs.map((x) => (
        <Link
          key={x.key}
          href={x.href}
          className={`btn btn-sm ${x.key === current ? "btn-primary" : "btn-secondary"}`}
          aria-current={x.key === current ? "page" : undefined}
        >
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
