import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconLockSimple } from "@/components/ui/icons";
import { longDate } from "@/lib/drop/present";
import { DdName } from "./parts";

/**
 * PUB-07 (D-022, U-08; J3 "signed-out share"): the question and the invitation-only explanation. No answers, no
 * names, no counts, and an answer link shows exactly this, with no hint about the answer's author. Sign-in
 * returns to the question.
 */
export async function PublicDrop({
  date,
  text,
  returnTo,
}: {
  date: string;
  text: string;
  returnTo: string;
}) {
  const t = await getTranslations("drop.public");
  const locale = await getLocale();
  return (
    <>
      <header className="dd dd-page pub-drop">
        <div className="dd-top">
          <DdName />
          <p className="dd-date">
            <time dateTime={date}>{longDate(date, locale)}</time>
          </p>
        </div>
        <h1 className="dd-q" tabIndex={-1}>
          {text}
        </h1>
        <p className="meta">{t("membersOnly")}</p>
      </header>
      <section className="info info-stack pub-join" aria-labelledby="h-join">
        <h2 id="h-join" className="section-title">
          {t("joinTitle")}
        </h2>
        <p>
          <IconLockSimple />
          <span>{t("joinText")}</span>
        </p>
        <Link
          href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
          className="btn btn-primary"
        >
          {t("signIn")}
        </Link>
        <Link href="/about/alpha" className="link">
          {t("aboutAlpha")}
        </Link>
      </section>
    </>
  );
}
