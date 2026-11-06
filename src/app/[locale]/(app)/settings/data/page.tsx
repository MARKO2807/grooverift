import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { CloseAccountFlow } from "@/components/settings/close-account";
import { Notice } from "@/components/ui/notice";
import { exportViewFor } from "@/lib/account/export-view";
import { deletionDate, isFreshSignIn } from "@/lib/account/rules";
import { memberPage } from "@/lib/auth/member-page";
import { accountFacts } from "@/lib/data/account";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.close");
  return { title: t("title") };
}

/**
 * SET-09 "Deaktiviraj ili izbriši račun" (D-063 (9), D-066, D-070 (7)): entered from the very bottom of Settings.
 * The data copy lives inside this flow (D-066 (2)); a staff account is told to hand its role back first.
 */
export default async function CloseAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await memberPage(locale, "/settings/data");
  const t = await getTranslations("account.close");
  const f = await getFormatter();
  const [facts, copy] = await Promise.all([
    accountFacts(session.user.id),
    exportViewFor(session.user.id),
  ]);
  const now = new Date();
  const deleteDate = f.dateTime(deletionDate(now), { day: "numeric", month: "long" });
  return (
    <AppShell title={t("title")} backHref="/settings" nav="settings" screen="narrow">
      {facts?.isStaff ? (
        <Notice kind="info">{t("staff")}</Notice>
      ) : (
        <CloseAccountFlow
          deleteDate={deleteDate}
          hasPassword={facts?.hasPassword ?? false}
          fresh={isFreshSignIn(new Date(session.session.createdAt), now)}
          initialCopy={copy}
        />
      )}
    </AppShell>
  );
}
