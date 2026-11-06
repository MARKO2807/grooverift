import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ContinueButton } from "@/components/safety/hold-actions";
import { NoticeView } from "@/components/safety/notice-view";
import { IconClock, IconLock } from "@/components/ui/icons";
import { signOutAction } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import { accountHold } from "@/lib/data/safety";
import { safeReturnTo } from "@/lib/routing/paths";

export const dynamic = "force-dynamic";

// i18n-keys: safety.hold.title.suspension safety.hold.title.ban safety.hold.title.restriction
// i18n-keys: safety.hold.lead.suspension safety.hold.lead.ban safety.hold.lead.restriction

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safety.hold");
  return { title: t("pageTitle") };
}

/**
 * SAFE-07 (D-075): a suspension or a ban is a full screen with the statement of reasons and the appeal inline, and
 * no entry to the app; a posting restriction is shown once with "Nastavi". memberPage sends members here.
 */
export default async function AccountStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  const returnTo = safeReturnTo((await searchParams).returnTo);
  const session = await getSession();
  if (!session) redirect({ href: "/sign-in", locale });
  const hold = await accountHold(session!.user.id);
  if (!hold) redirect({ href: returnTo, locale });
  const t = await getTranslations("safety.hold");
  const f = await getFormatter();
  const n = hold!.notice;
  const date = n?.endsAt ? f.dateTime(n.endsAt, { day: "numeric", month: "long" }) : "";
  const kind = hold!.kind;
  return (
    <AuthScreen
      title={t(`title.${kind}`, { date })}
      icon={kind === "restriction" ? <IconClock /> : <IconLock />}
    >
      <p className="lead">{t(`lead.${kind}`, { date })}</p>
      {n ? (
        kind === "restriction" ? (
          <details className="sor-more">
            <summary>{t("why")}</summary>
            <NoticeView n={n} showTitle={false} />
          </details>
        ) : (
          <NoticeView n={n} showTitle={false} />
        )
      ) : null}
      {kind === "restriction" && n ? (
        <ContinueButton actionId={n.id} returnTo={returnTo} />
      ) : (
        <form action={signOutAction}>
          <button type="submit" className="btn btn-secondary btn-block">
            {t("signOut")}
          </button>
        </form>
      )}
    </AuthScreen>
  );
}
