import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Wordmark } from "@/components/brand/wordmark";
import { IconBulb, IconCalendar, IconChart, IconUsers } from "@/components/ui/icons";
import { howAction } from "@/lib/onboarding/actions";
import { stepPage } from "@/lib/onboarding/page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join.how");
  return { title: t("title") };
}

/**
 * ONB-07 "Kako radi" (D-086): the Daily Drop card leads, three compact cards follow. The animated K2 tile
 * (the rift and the bolt) is a canvas motif for a later pass; the calendar icon stands in until then.
 */
export default async function HowPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await stepPage(locale, "how");
  const t = await getTranslations("join.how");
  return (
    <AuthScreen title={t("title")} back={page.back} progress={page.progress}>
      <ol className="how">
        <li className="how-card how-main">
          <div className="how-k-row">
            <div className="how-vis" aria-hidden="true">
              <IconCalendar className="how-ic" />
            </div>
            <h2 className="how-t">Daily Drop</h2>
          </div>
          <p>{t("dropText")}</p>
        </li>
        <li className="how-card">
          <div className="how-vis" aria-hidden="true">
            <IconChart className="how-ic" />
          </div>
          <div>
            <h2 className="how-t">{t("poll")}</h2>
            <p>{t("pollText")}</p>
          </div>
        </li>
        <li className="how-card">
          <div className="how-vis" aria-hidden="true">
            <IconBulb className="how-ic" />
          </div>
          <div>
            <h2 className="how-t">{t("know")}</h2>
            <p>{t("knowText")}</p>
          </div>
        </li>
        <li className="how-card">
          <div className="how-vis" aria-hidden="true">
            <IconUsers className="how-ic" />
          </div>
          <div>
            <h2 className="how-t">{t("people")}</h2>
            <p>{t.rich("peopleText", { brand: () => <Wordmark inline /> })}</p>
          </div>
        </li>
      </ol>
      <form action={howAction}>
        <button type="submit" className="btn btn-primary btn-block">
          {t("next")}
        </button>
      </form>
    </AuthScreen>
  );
}
