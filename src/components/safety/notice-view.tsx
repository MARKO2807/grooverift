import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconCheckCircle } from "@/components/ui/icons";
import type { MemberNotice } from "@/lib/data/safety";
import { AppealForm } from "./appeal-form";

// SAFE-05, the statement of reasons as labelled sections (D-075 (4) A; R-07, DSA Art. 17): what, the rule, the
// decision, how it was decided (a person, never automated; the reporter never named) and the appeal (SAFE-06).
// Used in Settings → Status računa and on the SAFE-07 full screen. The legal wording is counsel's (B.3).

// i18n-keys: safety.kind.content_removal safety.kind.notice safety.kind.warning safety.kind.restriction
// i18n-keys: safety.kind.suspension safety.kind.ban safety.how.report safety.how.notice safety.how.staff
// i18n-keys: safety.rule.respect safety.rule.hate safety.rule.violence safety.rule.sexual safety.rule.adults
// i18n-keys: safety.rule.authentic safety.rule.spam safety.rule.copyright safety.rule.ai safety.rule.privacy
// i18n-keys: safety.rule.illegal safety.itemType.answer safety.itemType.comment safety.itemType.profile
// i18n-keys: safety.title.notice safety.title.warning safety.title.restriction safety.title.suspension
// i18n-keys: safety.title.ban safety.title.removed.answer safety.title.removed.comment safety.title.removed.profile
// i18n-keys: safety.title.removedWarning.answer safety.title.removedWarning.comment
// i18n-keys: safety.title.removedWarning.profile safety.effect.content_removal safety.effect.notice
// i18n-keys: safety.effect.warning safety.effect.restriction safety.effect.suspension safety.effect.ban

const DAY = { day: "numeric", month: "long" } as const;
const LONG = { day: "numeric", month: "long", year: "numeric" } as const;

/** The title of a decision, as in the list and on the detail page. */
export async function noticeTitle(n: MemberNotice): Promise<string> {
  const t = await getTranslations("safety");
  const f = await getFormatter();
  const type = n.item?.type ?? "answer";
  if (n.kind === "content_removal") return t(`title.removed.${type}`);
  if (n.kind === "warning" && n.removesContent) return t(`title.removedWarning.${type}`);
  if ((n.kind === "restriction" || n.kind === "suspension") && n.endsAt)
    return t(`title.${n.kind}`, { date: f.dateTime(n.endsAt, DAY) });
  return t(`title.${n.kind === "restriction" || n.kind === "suspension" ? "notice" : n.kind}`);
}

export async function NoticeView({
  n,
  showTitle = true,
}: {
  n: MemberNotice;
  showTitle?: boolean;
}) {
  const t = await getTranslations("safety");
  const f = await getFormatter();
  const until = n.endsAt ? f.dateTime(n.endsAt, DAY) : "";
  const appealOpen = n.appealOpen;
  return (
    <div className="sor">
      <p className="sor-date">
        {t(`kind.${n.kind}`)} · {f.dateTime(n.createdAt, LONG)}
      </p>
      {showTitle ? <h2 className="sub-h">{await noticeTitle(n)}</h2> : null}
      {n.revokedAt ? (
        <p className="sor-revoked">
          <IconCheckCircle />
          <span>{t("sor.revoked")}</span>
        </p>
      ) : null}
      <dl className="sor-list">
        <div>
          <dt>{t("sor.what")}</dt>
          <dd>
            {n.item ? (
              <blockquote className="sor-item">
                <span className="set-d">
                  {t(`itemType.${n.item.type}`)}
                  {n.item.date
                    ? `, ${t("sor.dropOf", { date: f.dateTime(new Date(`${n.item.date}T12:00:00Z`), DAY) })}`
                    : ""}
                </span>
                {n.item.text ? <span>„{n.item.text}”</span> : null}
              </blockquote>
            ) : (
              <span className="set-d">{t("sor.noCopy")}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>{t("sor.rule")}</dt>
          <dd>
            <b>{n.rule ? t(`rule.${n.rule}`) : t("rule.illegal")}</b>
            <span className="set-d">
              <Link href="/legal/guidelines" className="link">
                {t("sor.guidelines")}
              </Link>
            </span>
          </dd>
        </div>
        <div>
          <dt>{t("sor.decision")}</dt>
          <dd>
            <p>{n.statement}</p>
            <p className="set-d">
              {t(`effect.${n.kind}`, { date: until })}
              {n.removesContent && n.kind !== "content_removal" ? ` ${t("sor.alsoRemoved")}` : ""}
            </p>
          </dd>
        </div>
        <div>
          <dt>{t("sor.how")}</dt>
          <dd>
            {t(`how.${n.source}`)}
            {n.source === "report" ? ` ${t("sor.reporterHidden")}` : ""}
          </dd>
        </div>
        <div>
          <dt>{t("sor.appeal")}</dt>
          <dd>
            {n.appeal ? (
              <AppealState n={n} />
            ) : appealOpen ? (
              <>
                <p>{t("sor.appealUntil", { date: f.dateTime(n.appealUntil!, DAY) })}</p>
                <AppealForm actionId={n.id} />
              </>
            ) : n.revokedAt ? null : (
              <p>
                {n.appealUntil
                  ? t("sor.appealClosed", { date: f.dateTime(n.appealUntil, DAY) })
                  : t("sor.appealNone")}
              </p>
            )}
          </dd>
        </div>
      </dl>
      <p className="meta">{t("sor.draft")}</p>
    </div>
  );
}

async function AppealState({ n }: { n: MemberNotice }) {
  const t = await getTranslations("safety");
  const f = await getFormatter();
  const a = n.appeal!;
  if (a.status === "open")
    return <p>{t("sor.appealSent", { date: f.dateTime(a.createdAt, DAY) })}</p>;
  return (
    <>
      <p>
        <b>{a.status === "overturned" ? t("sor.appealOverturned") : t("sor.appealUpheld")}</b>
      </p>
      {a.outcomeText ? <p>{a.outcomeText}</p> : null}
    </>
  );
}
