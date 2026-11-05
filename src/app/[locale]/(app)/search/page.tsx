import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { PeopleSearchForm } from "@/components/profile/people-search";
import { PersonRow } from "@/components/profile/person-row";
import { IconSearch } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { foldQuery, SEARCH_MIN, searchPeople } from "@/lib/data/people";
import { consume } from "@/lib/data/rate-limit";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.search");
  return { title: t("title") };
}

/**
 * DISC-05 α (D-093 (3)): people by display name or @username. Results come through the policy (discoverable,
 * onboarded, active, not blocked either way); a private profile is a row like any other and shows the P state
 * when opened. Rate-limited per member; nothing here is ever cached (private, no-store).
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { locale } = await params;
  const session = await memberPage(locale, "/search");
  const t = await getTranslations("profile.search");
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const folded = foldQuery(query);
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  let state: "idle" | "short" | "tooMany" | "results" = "idle";
  let people: Awaited<ReturnType<typeof searchPeople>> = [];
  if (query.trim()) {
    if (folded.length < SEARCH_MIN) state = "short";
    else if (!(await consume("people", session.user.id)).allowed) state = "tooMany";
    else {
      people = await searchPeople(viewer, query);
      state = "results";
    }
  }
  return (
    <AppShell title={t("title")} backHref="/me" nav="profile" screen="narrow">
      <PeopleSearchForm query={query} />
      <p className="hint">{t("hint")}</p>
      {state === "short" ? <p className="set-note">{t("short", { min: SEARCH_MIN })}</p> : null}
      {state === "tooMany" ? (
        <p className="set-note" role="status">
          {t("tooMany")}
        </p>
      ) : null}
      {state === "results" ? (
        <section aria-labelledby="h-res" className="section">
          <h2 id="h-res" className="section-title">
            {t("results", { n: people.length })}
          </h2>
          {people.length ? (
            <ul className="fl-list">
              {people.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </ul>
          ) : (
            <div className="empty-b">
              <IconSearch />
              <p className="empty-t">{t("none")}</p>
              <p>{t("noneText")}</p>
            </div>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}
