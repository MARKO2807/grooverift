import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";
import { adminPageGate } from "@/components/admin/gate";
import { EditorialNav, statusLabel } from "@/components/admin/editorial-parts";
import {
  ApproveForm,
  DeleteForm,
  LocalTime,
  MoveButton,
  QuestionEditor,
  ReserveForm,
  ScheduleForm,
  WithdrawForm,
} from "@/components/admin/editorial";
import { Notice } from "@/components/ui/notice";
import { Link } from "@/i18n/navigation";
import { roleOf } from "@/lib/auth/session";
import { getQuestion, type QuestionDetail } from "@/lib/data/editorial";
import { loadViewer } from "@/lib/data/facts";
import { utcDate } from "@/lib/editorial/rules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.editorial.editor");
  return { title: t("title") };
}

function Texts({ q, missing }: { q: QuestionDetail; missing: string }) {
  return (
    <div className="ed-pair">
      {(["hr", "en"] as const).map((l) => (
        <div key={l} className="form-stack" style={{ gap: "var(--gr-space-2)" }}>
          <span className="label">{l === "hr" ? "Hrvatski" : "English"}</span>
          <p lang={l} className={`ed-text${q[l] ? "" : " ed-text-missing"}`}>
            {q[l]?.text ?? missing}
          </p>
        </div>
      ))}
    </div>
  );
}

/** ADM-05: one question with its lifecycle (J6). What the page offers depends on the state; the server decides. */
export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { locale, id } = await params;
  const gate = await adminPageGate(locale, `/admin/editorial/drops/${id}`, "editor", "admin");
  if (!gate.ok) return gate.element;
  if (!z.uuid().safeParse(id).success) notFound();
  const viewer = await loadViewer({ id: gate.session.user.id, role: roleOf(gate.session) });
  const q = await getQuestion(viewer, id);
  if (!q) notFound();
  const t = await getTranslations("admin.editorial.editor");
  const tm = await getTranslations("admin.editorial.moves");
  const f = await getFormatter();
  const label = await statusLabel();
  const today = utcDate();
  const ref = { id: q.id, version: q.version };
  const created = (await searchParams).created === "1";
  const both = !!q.hr && !!q.en;

  return (
    <section className="form-stack">
      <h2 className="set-t">{t("title")}</h2>
      <EditorialNav current="calendar" />
      {created ? <Notice kind="success">{t("created")}</Notice> : null}
      <ul className="set-list">
        <li className="set-row">
          <span className="set-txt">
            <span className="set-t">{t("state")}</span>
            <span className="set-d">
              {label(q)}
              {q.publishDate ? ` · ${q.publishDate} UTC` : ""}
            </span>
            {q.publishDate && q.status === "scheduled" ? <LocalTime date={q.publishDate} /> : null}
          </span>
        </li>
        <li className="set-row">
          <span className="set-txt">
            <span className="set-t">{t("people")}</span>
            <span className="set-d">
              {t("createdBy", { name: q.createdByName ?? "—" })}
              {q.approvedByName ? ` · ${t("approvedBy", { name: q.approvedByName })}` : ""}
            </span>
            <span className="set-d">
              {t("changedAt", {
                date: f.dateTime(q.updatedAt, { dateStyle: "medium", timeStyle: "short" }),
              })}
            </span>
          </span>
        </li>
      </ul>

      {q.status === "draft" || q.status === "in_review" ? (
        <QuestionEditor
          mode="edit"
          id={q.id}
          version={q.version}
          hr={q.hr?.text ?? ""}
          en={q.en?.text ?? ""}
          inReview={q.status === "in_review"}
        />
      ) : (
        <Texts q={q} missing={t("missing")} />
      )}

      <section className="ed-section" aria-labelledby="ed-next">
        <h3 id="ed-next" className="set-t">
          {tm("title")}
        </h3>
        {q.status === "draft" ? (
          <>
            {both ? null : <Notice kind="info">{tm("needBoth")}</Notice>}
            <MoveButton question={ref} to="submit" label={tm("submit")} variant="primary" />
          </>
        ) : null}
        {q.status === "in_review" ? (
          <>
            <ApproveForm question={ref} />
            <MoveButton question={ref} to="requestChanges" label={tm("requestChanges")} />
          </>
        ) : null}
        {q.status === "approved" ? (
          <>
            <ScheduleForm question={ref} today={today} />
            {q.isReserve ? (
              <MoveButton question={ref} to="unreserve" label={tm("unreserve")} />
            ) : (
              <ReserveForm question={ref} />
            )}
            <MoveButton question={ref} to="toDraft" label={tm("toDraft")} />
          </>
        ) : null}
        {q.status === "scheduled" ? (
          <>
            <p className="meta">{tm("scheduledLead")}</p>
            <div className="ed-row-actions">
              <MoveButton question={ref} to="unschedule" label={tm("unschedule")} />
              <MoveButton question={ref} to="toDraft" label={tm("toDraft")} />
            </div>
          </>
        ) : null}
        {q.status === "failed" ? (
          <>
            <Notice kind="error">{tm("failedLead")}</Notice>
            <Link
              href="/admin/editorial/jobs"
              className="btn btn-primary btn-sm"
              style={{ alignSelf: "flex-start" }}
            >
              {tm("toJobs")}
            </Link>
            <MoveButton question={ref} to="toDraft" label={tm("toDraft")} />
          </>
        ) : null}
        {q.status === "published" ? (
          <>
            <Notice kind="info">{tm("publishedLead")}</Notice>
          </>
        ) : null}
        {q.status === "withdrawn" ? <Notice kind="info">{tm("withdrawnLead")}</Notice> : null}
      </section>

      {q.status === "published" && gate.role === "admin" ? (
        <section className="ed-section" aria-labelledby="ed-withdraw">
          <h3 id="ed-withdraw" className="set-t">
            {tm("withdrawTitle")}
          </h3>
          <p className="meta">{tm("withdrawLead")}</p>
          <WithdrawForm question={ref} />
        </section>
      ) : null}

      {q.status === "draft" || q.status === "in_review" || q.status === "approved" ? (
        <section className="ed-section" aria-labelledby="ed-delete">
          <h3 id="ed-delete" className="set-t">
            {tm("deleteTitle")}
          </h3>
          <DeleteForm question={ref} />
        </section>
      ) : null}
    </section>
  );
}
