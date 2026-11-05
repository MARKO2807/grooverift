import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Notice } from "@/components/ui/notice";
import type { EditorialHealth, QuestionDetail } from "@/lib/data/editorial";
import { RESERVE_LOW, type DropStatus } from "@/lib/editorial/rules";

// Server parts shared by the editorial pages (ADM-01, ADM-04, ADM-05, ADM-09; step 5.6).

/** The editorial sub-navigation; the current page is marked with aria-current. */
export async function EditorialNav({
  current,
}: {
  current: "calendar" | "new" | "reserve" | "jobs";
}) {
  const tn = await getTranslations("admin.editorial.nav");
  const items = [
    ["calendar", "/admin/editorial", tn("calendar")],
    ["new", "/admin/editorial/drops/new", tn("new")],
    ["reserve", "/admin/editorial/reserve", tn("reserve")],
    ["jobs", "/admin/editorial/jobs", tn("jobs")],
  ] as const;
  return (
    <nav aria-label={tn("label")} className="foot-row">
      {items.map(([key, href, label]) => (
        <Link
          key={key}
          href={href}
          className={`btn btn-sm ${key === current ? "btn-primary" : "btn-secondary"}`}
          aria-current={key === current ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** JO4 and J6 warnings in words with an icon (never colour alone). Nothing when all is well. */
export async function HealthNotices({ health }: { health: EditorialHealth }) {
  const th = await getTranslations("admin.editorial.health");
  const items: { kind: "warning" | "error" | "info"; text: string }[] = [];
  if (health.paused) items.push({ kind: "warning", text: th("paused") });
  if (health.todayFailed)
    items.push({
      kind: "error",
      text: th("todayFailed", { date: health.today, attempt: health.todayFailed.attempt }),
    });
  if (health.stale.length)
    items.push({ kind: "error", text: th("stale", { dates: health.stale.join(", ") }) });
  if (health.gaps.length)
    items.push({ kind: "warning", text: th("gaps", { dates: health.gaps.join(", ") }) });
  if (health.reserveLow)
    items.push({
      kind: "warning",
      text: th("reserveLow", { n: health.reserve, min: RESERVE_LOW }),
    });
  if (health.reserveUsed.length)
    items.push({ kind: "info", text: th("reserveUsed", { dates: health.reserveUsed.join(", ") }) });
  if (!items.length) return <Notice kind="success">{th("allGood")}</Notice>;
  return (
    <div className="form-stack" style={{ gap: "var(--gr-space-2)" }}>
      {items.map((i) => (
        <Notice key={i.text} kind={i.kind}>
          {i.text}
        </Notice>
      ))}
    </div>
  );
}

// i18n-keys: admin.editorial.status.draft admin.editorial.status.in_review admin.editorial.status.approved admin.editorial.status.scheduled admin.editorial.status.published admin.editorial.status.failed admin.editorial.status.withdrawn admin.editorial.status.reserve
export async function statusLabel() {
  const ts = await getTranslations("admin.editorial.status");
  return (q: Pick<QuestionDetail, "status" | "isReserve">) =>
    q.status === "approved" && q.isReserve ? ts("reserve") : ts(q.status as DropStatus);
}

/** The question in the page's language, else the other one, with its lang attribute. */
export function QuestionLine({ q, locale }: { q: QuestionDetail; locale: string }) {
  const first = locale === "en" ? q.en : q.hr;
  const lang = first ? (locale === "en" ? "en" : "hr") : locale === "en" ? "hr" : "en";
  const text = first?.text ?? (locale === "en" ? q.hr?.text : q.en?.text) ?? "";
  return (
    <span className="ed-q" lang={lang}>
      {text}
    </span>
  );
}

/** "HR ✓ · EN —" in words for screen readers: which languages exist and whether they are approved. */
export async function LanguagesCell({ q }: { q: QuestionDetail }) {
  const tg = await getTranslations("admin.editorial.languages");
  const one = (code: "HR" | "EN", t: QuestionDetail["hr"]) =>
    `${code} ${t ? (t.approved ? tg("approved") : tg("draft")) : tg("missing")}`;
  return (
    <span>
      {one("HR", q.hr)} · {one("EN", q.en)}
    </span>
  );
}
