import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { noticeTitle } from "@/components/safety/notice-view";
import { IconCheckCircle, IconChevron } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { myNotices } from "@/lib/data/safety";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safety.status");
  return { title: t("notices") };
}

/** SAFE-05: every moderation decision about the member, newest first. */
export default async function NoticesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/status/notices");
  const t = await getTranslations("safety");
  const f = await getFormatter();
  const notices = await myNotices(session.user.id);
  const titles = await Promise.all(notices.map((n) => noticeTitle(n)));
  return (
    <AppShell
      title={t("status.notices")}
      backHref="/settings/status"
      nav="settings"
      screen="narrow"
    >
      {notices.length ? (
        <ul className="set-list">
          {notices.map((n, i) => (
            <li key={n.id}>
              <Link href={`/settings/status/notices/${n.id}`} className="set-link">
                <span className="set-txt">
                  <span className="set-t">{titles[i]}</span>
                  <span className="set-d">
                    {t(`kind.${n.kind}`)} ·{" "}
                    {f.dateTime(n.createdAt, { day: "numeric", month: "long", year: "numeric" })}
                    {n.appeal?.status === "open" ? ` · ${t("status.appealSent")}` : ""}
                    {n.revokedAt ? ` · ${t("status.revoked")}` : ""}
                  </span>
                </span>
                <IconChevron />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-b">
          <IconCheckCircle />
          <p className="empty-t">{t("status.noticesEmpty")}</p>
          <p>{t("status.noticesEmptyText")}</p>
        </div>
      )}
    </AppShell>
  );
}
