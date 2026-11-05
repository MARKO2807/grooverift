import { AppShell } from "@/components/app-shell";
import { PublicShell } from "@/components/shell/public-shell";
import { NotAvailable } from "@/components/system/states";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";

/** SYS-01: the one "nije dostupno" page (IA8, U-02, U-03), HTTP 404. Members see it in the app shell,
 *  visitors in the public shell; the reason never shows. */
export default async function NotFound() {
  const session = await getSession();
  if (session) {
    const t = await getTranslations("system");
    return (
      <AppShell title={t("naTitle")} bodyHeading>
        <NotAvailable signedIn />
      </AppShell>
    );
  }
  return (
    <PublicShell screen="na">
      <NotAvailable signedIn={false} />
    </PublicShell>
  );
}
