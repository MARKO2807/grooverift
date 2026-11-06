import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { IconChevron, IconWarning } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { myReports } from "@/lib/data/safety";

export const dynamic = "force-dynamic";

// i18n-keys: safety.reportStatus.received safety.reportStatus.review safety.reportStatus.done

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safety.status");
  return { title: t("reports") };
}

/** SAFE-04: the member's own reports with their status; nothing about the other person (D-075). */
export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/status/reports");
  const t = await getTranslations("safety");
  const f = await getFormatter();
  const reports = await myReports(session.user.id);
  return (
    <AppShell
      title={t("status.reports")}
      backHref="/settings/status"
      nav="settings"
      screen="narrow"
    >
      {reports.length ? (
        <ul className="set-list">
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/settings/status/reports/${r.id}`} className="set-link">
                <span className="set-txt">
                  <span className="set-t">{t(`cat.${r.category}.name`)}</span>
                  <span className="set-d">
                    {t(`target.${r.targetType}`, { username: r.handle ?? "—" })} ·{" "}
                    {f.dateTime(r.createdAt, { day: "numeric", month: "long" })}
                  </span>
                </span>
                <span className={`status-pill is-${r.status}`}>
                  {t(`reportStatus.${r.status}`)}
                </span>
                <IconChevron />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-b">
          <IconWarning />
          <p className="empty-t">{t("status.reportsEmpty")}</p>
          <p>{t("status.reportsEmptyText")}</p>
        </div>
      )}
      <p className="set-note">{t("status.reportsNote")}</p>
    </AppShell>
  );
}
