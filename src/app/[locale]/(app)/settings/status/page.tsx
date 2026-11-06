import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { IconCheckCircle, IconChevron, IconClock } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { statusSummary } from "@/lib/data/safety";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safety.status");
  return { title: t("title") };
}

/** The account status hub (D-075): an active restriction or "all fine", decisions (SAFE-05), my reports (SAFE-04). */
export default async function StatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/status");
  const t = await getTranslations("safety.status");
  const f = await getFormatter();
  const { restriction, notices, reports } = await statusSummary(session.user.id);
  const open = reports.filter((r) => r.status !== "done").length;
  const rows = [
    {
      href: "/settings/status/notices",
      title: t("notices"),
      text: notices.length
        ? t("noticesCount", {
            count: notices.length,
            date: f.dateTime(notices[0]!.createdAt, { day: "numeric", month: "long" }),
          })
        : t("noticesNone"),
    },
    {
      href: "/settings/status/reports",
      title: t("reports"),
      text: reports.length ? t("reportsCount", { count: reports.length, open }) : t("reportsNone"),
    },
  ];
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      {restriction ? (
        <div className="sub-hero sub-hero-wait">
          <IconClock />
          <p className="sub-hero-t">
            {t("restricted", {
              date: f.dateTime(restriction.endsAt, { day: "numeric", month: "long" }),
            })}
          </p>
          <p className="help">
            {t("restrictedText")}{" "}
            <Link href={`/settings/status/notices/${restriction.id}`} className="link">
              {t("readWhy")}
            </Link>
          </p>
        </div>
      ) : (
        <div className="sub-hero">
          <IconCheckCircle />
          <p className="sub-hero-t">{t("fine")}</p>
          <p className="help">{t("fineText")}</p>
        </div>
      )}
      <ul className="set-list">
        {rows.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="set-link">
              <span className="set-txt">
                <span className="set-t">{r.title}</span>
                <span className="set-d">{r.text}</span>
              </span>
              <IconChevron />
            </Link>
          </li>
        ))}
      </ul>
      <p className="set-note">{t("note")}</p>
    </AppShell>
  );
}
