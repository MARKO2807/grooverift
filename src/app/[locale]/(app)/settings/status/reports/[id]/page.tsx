import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { memberPage } from "@/lib/auth/member-page";
import { myReports } from "@/lib/data/safety";
import { notAvailable } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

// i18n-keys: safety.status.outcome.action safety.status.outcome.none
// i18n-keys: safety.reportStatus.received safety.reportStatus.review safety.reportStatus.done

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safety.status");
  return { title: t("report") };
}

/** SAFE-04 detail: received → in review → decided, and at the end only whether action was taken. */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await memberPage(locale, `/settings/status/reports/${id}`);
  const [r] = await myReports(session.user.id, id);
  if (!r) notAvailable();
  const t = await getTranslations("safety");
  const f = await getFormatter();
  const steps = [
    { key: "received", on: true, d: f.dateTime(r.createdAt, { day: "numeric", month: "long" }) },
    {
      key: "review",
      on: r.status !== "received",
      d: r.status === "received" ? t("status.waiting") : "",
    },
    { key: "done", on: r.status === "done", d: r.outcome ? t(`status.outcome.${r.outcome}`) : "" },
  ] as const;
  return (
    <AppShell
      title={t("status.report")}
      backHref="/settings/status/reports"
      nav="settings"
      screen="narrow"
    >
      <div className="rep-head">
        <p className="set-t">{t(`cat.${r.category}.name`)}</p>
        <p className="set-d">{t(`target.${r.targetType}`, { username: r.handle ?? "—" })}</p>
      </div>
      <ol className="rep-steps">
        {steps.map((s) => (
          <li key={s.key} className={s.on ? "on" : undefined}>
            <span className="rep-dot" aria-hidden="true" />
            <span className="set-txt">
              <span className="set-t">
                {t(`reportStatus.${s.key}`)}
                {s.on ? null : <span className="sr-only">{t("status.notYet")}</span>}
              </span>
              {s.d ? <span className="set-d">{s.d}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <p className="help">
        {r.status === "done"
          ? r.outcome === "action"
            ? t("status.thanksAction")
            : t("status.thanksNone")
          : t("status.inReview")}
      </p>
    </AppShell>
  );
}
