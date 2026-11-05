import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { BuildingPlaceholder } from "@/components/system/states";
import { IconChevron, IconUserPlus } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { pendingRequestCount } from "@/lib/data/graph";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("activity") };
}

/**
 * ACT-01 placeholder; Activity arrives in step 5.8. The follow-requests row (ACT-02 entry, D-074 (5)) sits on
 * top from step 5.5: one row with the count, shown only while requests are waiting.
 */
export default async function ActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/activity");
  const t = await getTranslations("nav");
  const tp = await getTranslations("placeholder");
  const tr = await getTranslations("profile.requests");
  const pending = await pendingRequestCount(session.user.id);
  return (
    <AppShell title={t("activity")} nav="activity" screen="activity">
      {pending ? (
        <ul className="set-list">
          <li>
            <Link href="/activity/requests" className="set-link req-entry">
              <IconUserPlus />
              <span className="set-txt">
                <span className="set-t">
                  {tr("title")}
                  <span className="req-n" aria-hidden="true">
                    {pending}
                  </span>
                </span>
                <span className="set-d">{tr("rowCount", { n: pending })}</span>
              </span>
              <IconChevron />
            </Link>
          </li>
        </ul>
      ) : null}
      <BuildingPlaceholder text={tp("activity")} />
    </AppShell>
  );
}
