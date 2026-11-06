import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DataCopy } from "@/components/settings/close-account";
import { RestoreButton } from "@/components/settings/restore";
import { IconClock } from "@/components/ui/icons";
import { exportViewFor } from "@/lib/account/export-view";
import { signOutAction } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import { pendingDeletion } from "@/lib/data/account";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.pending");
  return { title: t("pageTitle") };
}

/**
 * Sign-in during the 30-day grace period (SET-09, prototype `pending`): the date, and two choices of equal weight,
 * "Odjavi se" and "Vrati račun". The data copy stays available here too (D-066). memberPage sends members here.
 */
export default async function AccountDeletionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect({ href: "/sign-in", locale });
  const pending = await pendingDeletion(session!.user.id);
  if (!pending) redirect({ href: "/home", locale });
  const t = await getTranslations("account.pending");
  const f = await getFormatter();
  const date = f.dateTime(pending!.scheduledFor, { day: "numeric", month: "long" });
  const requested = f.dateTime(pending!.requestedAt, { day: "numeric", month: "long" });
  const copy = await exportViewFor(session!.user.id);
  return (
    <AuthScreen title={t("title", { date })} icon={<IconClock />}>
      <p className="lead">{t("lead", { date, requested })}</p>
      <section className="form-stack" aria-labelledby="h-copy">
        <h2 id="h-copy" className="set-t">
          {t("copyTitle")}
        </h2>
        <DataCopy initial={copy} />
      </section>
      <div className="foot-row equal">
        <form action={signOutAction} className="contents">
          <button type="submit" className="btn btn-secondary">
            {t("signOut")}
          </button>
        </form>
        <RestoreButton />
      </div>
    </AuthScreen>
  );
}
