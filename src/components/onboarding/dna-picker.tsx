"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Spirala } from "@/components/motifs/spirala";
import type { FormState } from "@/lib/auth/actions";
import { dnaAction } from "@/lib/onboarding/actions";
import { searchGenresAction } from "@/lib/music/actions";
import { SEARCH_LIMIT, type GenreOption } from "@/lib/music/genre-search";
import { GENRE_MAX, GENRE_MIN } from "@/lib/music/limits";
import { FieldError } from "@/components/ui/field";
import { IconCheck, IconPlus, IconSearch, IconX } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, useFormErrorFocus } from "@/components/ui/form-status";
import { useFormStatus } from "react-dom";

type Found = { q: string; list: GenreOption[]; failed: boolean };

/**
 * ONB-05 (J1 step 7, D-053, D-063 (4)): the main genres as toggle chips, "+ Još žanrova" opens the search for the
 * other 2,000; the live Spirala above shows the picks. Nothing is saved until Continue (the picks travel as
 * repeated `genre` fields in pick order); Skip keeps nothing. Artists arrive with the catalogue client (5.3b).
 */
export function DnaPicker({
  suggestions,
  initial,
}: {
  suggestions: GenreOption[];
  initial: GenreOption[];
}) {
  const t = useTranslations("join.dna");
  const te = useTranslations("authErrors");
  const ts = useTranslations("spirala");
  const [state, action] = useActionState<FormState, FormData>(dnaAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const id = useId();
  const [picked, setPicked] = useState<GenreOption[]>(initial);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const pickedIds = new Set(picked.map((g) => g.id));
  const full = picked.length >= GENRE_MAX;
  const q = query.trim();
  // Results are shown only for the query they answer; a late answer for an older query is never shown.
  const results = q && found?.q === q ? found : null;

  function toggle(g: GenreOption) {
    setPicked((list) =>
      list.some((x) => x.id === g.id)
        ? list.filter((x) => x.id !== g.id)
        : list.length >= GENRE_MAX
          ? list
          : [...list, g],
    );
  }

  // The search runs 250 ms after typing stops (the server rate-limits the typeahead as well).
  useEffect(() => {
    if (!q) return;
    const timer = setTimeout(async () => {
      const res = await searchGenresAction(q);
      setFound({ q, list: res.ok ? (res.results ?? []) : [], failed: !res.ok });
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const err = state.fieldErrors?.genres ? te(state.fieldErrors.genres) : null;
  // The chips above never show what the search found, so a search hit that is not a suggestion is listed as picked.
  const extraPicked = picked.filter((g) => !suggestions.some((s) => s.id === g.id));

  const chip = (g: GenreOption, withParent = false) => {
    const on = pickedIds.has(g.id);
    return (
      <button
        type="button"
        className="chip"
        aria-pressed={on}
        aria-disabled={!on && full ? true : undefined}
        onClick={() => (!on && full ? undefined : toggle(g))}
      >
        <span className="ck" aria-hidden="true">
          <IconCheck />
        </span>
        {g.name}
        {withParent && g.parentName ? <span className="opt"> · {g.parentName}</span> : null}
      </button>
    );
  };

  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead lead-sm">{t("lead", { min: GENRE_MIN, max: GENRE_MAX })}</p>
      {state.error ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{te(state.error)}</Notice>
        </ErrorSummary>
      ) : null}
      <div className="dna-live">
        <Spirala
          genres={picked.map((g) => ({ name: g.name, traitKey: g.traitKey, key: g.slug }))}
          caption={ts("listLabel")}
          height={176}
          captionHidden
          intro={false}
        />
        <p className="dna-count" aria-live="polite">
          {picked.length
            ? t("count", { count: picked.length, max: GENRE_MAX })
            : t("countNone", { min: GENRE_MIN })}
        </p>
      </div>
      {picked.map((g) => (
        <input key={g.id} type="hidden" name="genre" value={g.id} />
      ))}
      <div
        className="group"
        role="group"
        aria-labelledby={`${id}-genres`}
        aria-describedby={err ? `${id}-err` : undefined}
      >
        <h2 className="group-title" id={`${id}-genres`}>
          {t("genres")}{" "}
          <span className="opt">{t("genresOpt", { min: GENRE_MIN, max: GENRE_MAX })}</span>
        </h2>
        {err ? <FieldError id={`${id}-err`} text={err} /> : null}
        <div className="chips chips-genres">
          {suggestions.map((g) => (
            <span key={g.id} className="contents">
              {chip(g)}
            </span>
          ))}
          {extraPicked.map((g) => (
            <span key={g.id} className="contents">
              {chip(g)}
            </span>
          ))}
          {!searchOpen ? (
            <button
              type="button"
              className="chip chip-more"
              aria-expanded={false}
              aria-controls={`${id}-search`}
              onClick={() => setSearchOpen(true)}
            >
              <IconPlus /> {t("more")}
            </button>
          ) : null}
        </div>
        {searchOpen ? (
          <div className="field" id={`${id}-search`}>
            <label className="label-sm" htmlFor={`${id}-q`}>
              {t("searchLabel")}
            </label>
            <div className="input-wrap has-prefix">
              <span className="prefix" aria-hidden="true">
                <IconSearch />
              </span>
              <input
                ref={searchRef}
                className="input"
                id={`${id}-q`}
                type="search"
                autoComplete="off"
                maxLength={60}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-describedby={`${id}-hint`}
                aria-controls={`${id}-results`}
              />
            </div>
            <p className="help" id={`${id}-hint`}>
              {t("searchHint")}
            </p>
            <ul className="chips" id={`${id}-results`} aria-live="polite">
              {results?.list.map((g) => (
                <li key={g.id}>{chip(g, true)}</li>
              ))}
            </ul>
            {results && !results.list.length ? (
              <p className="status-line" role="status">
                {results.failed ? <IconX /> : null}
                <span>{results.failed ? t("searchFailed") : t("noResults")}</span>
              </p>
            ) : null}
            {results && results.list.length >= SEARCH_LIMIT ? (
              <p className="help">{t("moreResults")}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="group">
        <h2 className="group-title">
          {t("artists")} <span className="opt">{t("artistsOpt")}</span>
        </h2>
        <p className="help">{t("artistsSoon")}</p>
      </div>
      <Buttons skip={t("skip")} next={t("next")} busy={t("submitting")} />
    </form>
  );
}

function Buttons({ skip, next, busy }: { skip: string; next: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="foot-row">
      <button
        type="submit"
        name="skip"
        value="1"
        className="btn btn-secondary"
        aria-disabled={pending || undefined}
      >
        {skip}
      </button>
      <button type="submit" className="btn btn-primary" aria-disabled={pending || undefined}>
        {pending ? busy : next}
      </button>
    </div>
  );
}
