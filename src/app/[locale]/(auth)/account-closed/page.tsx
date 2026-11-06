import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { IconCheck, IconClock } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.closed");
  return { title: t("pageTitle") };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The end of SET-09 (prototype `done`): the member is already signed out. "Deaktiviran" says how to come back;
 * "zakazano" names the date and that a confirmation went by email. Only a date travels in the URL.
 */
export default async function AccountClosedPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string; d?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("account.closed");
  const f = await getFormatter();
  const deleted = sp.k === "deleted";
  const date =
    deleted && sp.d && DAY.test(sp.d)
      ? f.dateTime(new Date(`${sp.d}T12:00:00Z`), { day: "numeric", month: "long" })
      : null;
  return (
    <AuthScreen
      title={
        deleted
          ? date
            ? t("deletedTitle", { date })
            : t("deletedTitleNoDate")
          : t("deactivatedTitle")
      }
      icon={deleted ? <IconClock /> : <IconCheck />}
    >
      <p className="lead">{deleted ? t("deletedText") : t("deactivatedText")}</p>
      <Link href="/sign-in" className="btn btn-secondary btn-block">
        {t("ok")}
      </Link>
    </AuthScreen>
  );
}
