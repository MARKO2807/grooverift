import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/profile/avatar";
import { IconCalendar } from "@/components/ui/icons";
import { dropHistory, profileByUsername } from "@/lib/data/profiles";
import { notAvailable, profileViewer } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; username: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("history") };
}

/**
 * `/@<username>/drops` (PROF-03, D-074 (4)): the member's Daily Drop answers, newest first, for viewers who may
 * see the section (D-032). Each row opens that day's question (step 5.7 builds the question page).
 */
export default async function DropsPage({ params }: { params: Params }) {
  const { locale, username } = await params;
  const lang = locale === "en" ? "en" : "hr";
  const { viewer, session } = await profileViewer(locale, `/@${username}/drops`);
  if (!session) notAvailable();
  const view = await profileByUsername(viewer, username);
  if (view.kind !== "profile" || !view.sections.dropHistory) notAvailable();
  const history = await dropHistory(viewer, view.ownerId, lang, 100);
  if (!history) notAvailable();
  const t = await getTranslations("profile");
  const f = await getFormatter();
  return (
    <AppShell
      title={t("history")}
      backHref={`/@${view.username}`}
      nav={view.self ? "profile" : undefined}
      screen="narrow"
    >
      <Link href={`/@${view.username}`} className="fl-person mdrops-head">
        <Avatar name={view.displayName} size="sm" photo={view.photoId} />
        <span className="set-txt">
          <span className="set-t">{view.displayName}</span>
          <span className="set-d">@{view.username}</span>
        </span>
      </Link>
      {history.items.length ? (
        <ul className="hist">
          {history.items.map((h) => (
            <li key={h.answerId}>
              <Link href={`/drop/${h.date}`} className="hrow">
                <span className="hrow-q">
                  <time dateTime={h.date}>
                    {f.dateTime(new Date(h.date + "T00:00:00Z"), {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </time>
                  <span aria-hidden="true"> · </span>
                  <span className="sr-only">, </span>
                  {h.question}
                </span>
                <span className="hrow-t" lang={h.language ?? undefined}>
                  {h.text}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-b">
          <IconCalendar />
          <p className="empty-t">{t("historyEmpty")}</p>
          <p>{view.self ? t("historyEmptyOwn") : t("historyEmptyOther")}</p>
        </div>
      )}
      <p className="set-note">{view.self ? t("historyNoteOwn") : t("historyNoteOther")}</p>
    </AppShell>
  );
}
