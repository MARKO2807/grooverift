import { getTranslations } from "next-intl/server";
import { IconSearch } from "@/components/ui/icons";
import { SEARCH_MAX } from "@/lib/data/people";

/**
 * DISC-05 α (D-093 (3)): the people search field on the Profile tab. A plain GET form to /search, so it works
 * without JavaScript and the query stays in the address bar (no results are ever cached: /search is private).
 */
export async function PeopleSearchForm({ query = "" }: { query?: string }) {
  const t = await getTranslations("profile.search");
  return (
    <form action="/search" method="get" role="search" className="psearch" aria-label={t("title")}>
      <label className="sr-only" htmlFor="people-q">
        {t("label")}
      </label>
      <div className="input-wrap has-prefix">
        <span className="prefix" aria-hidden="true">
          <IconSearch />
        </span>
        <input
          id="people-q"
          name="q"
          type="search"
          className="input"
          defaultValue={query}
          placeholder={t("placeholder")}
          maxLength={SEARCH_MAX}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      <button type="submit" className="btn btn-secondary">
        {t("go")}
      </button>
    </form>
  );
}
