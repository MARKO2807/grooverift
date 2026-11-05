import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { RequestsList } from "@/components/profile/requests";
import { IconLock } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { pendingFollowRequests } from "@/lib/data/graph";
import { privacyState } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.requests");
  return { title: t("title") };
}

/** ACT-02 at /activity/requests (D-074 (5)): the owner's open follow requests; a public profile has none. */
export default async function RequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/activity/requests");
  const t = await getTranslations("profile.requests");
  const [state, requests] = await Promise.all([
    privacyState(session.user.id),
    pendingFollowRequests(session.user.id),
  ]);
  return (
    <AppShell title={t("title")} backHref="/activity" nav="activity" screen="narrow">
      {state?.visibility === "private" || requests.length ? (
        <RequestsList initial={requests} />
      ) : (
        <div className="empty-b">
          <IconLock />
          <p className="empty-t">{t("notPrivate")}</p>
          <p>{t("notPrivateText")}</p>
        </div>
      )}
    </AppShell>
  );
}
