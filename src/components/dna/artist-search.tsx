"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconCheck, IconPlus, IconSearch, IconWarning } from "@/components/ui/icons";
import type { ArtistOption } from "@/lib/data/music-dna";
import { searchArtistsAction, type DnaFailure } from "@/lib/music/actions";
import { ArtistTile } from "./artist-tile";

// The artist typeahead (J2, D-060 (2), prototype round 6 "?art=genre"): a result shows the artist's main genres; for
// artists sharing a name it adds the country, the years and the MusicBrainz description (J2 E8). The search runs on
// the server (one request per second to MusicBrainz, cached), so the field waits 400 ms after typing and needs two
// characters. "Katalog trenutačno ne radi." with Retry when the catalogue cannot answer (D-078).

type State =
  | { s: "idle" }
  | { s: "loading" }
  | { s: "ok"; items: ArtistOption[] }
  | { s: "empty" }
  | { s: "down" };

/** The line under a result's name (D-060 (2)). */
export function artistMeta(a: ArtistOption): string {
  const genres = a.genres.join(", ");
  if (!a.sameName) return genres || a.country || "";
  const where = [a.country, a.years].filter(Boolean).join(", ");
  return [genres, where, a.disambiguation].filter(Boolean).join(" · ");
}

export function ArtistSearch({
  inputId,
  disabled,
  pickedMbids,
  onPick,
  onFailure,
  markSaved = true,
}: {
  inputId: string;
  /** Music DNA marks artists already saved there; the answer composer's cards do not (step 5.7 remainder). */
  markSaved?: boolean;
  disabled: boolean;
  /** Artists already chosen in this view (the server also marks the saved ones). */
  pickedMbids: ReadonlySet<string>;
  onPick: (a: ArtistOption) => void;
  /** Failures other than the catalogue being down (signed out, too many, paused). */
  onFailure: (reason: DnaFailure | undefined) => void;
}) {
  const t = useTranslations("dna.artist");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  // The answer for one query and attempt; the shown state is derived, so typing never sets state in an effect.
  const [answer, setAnswer] = useState<{ key: string; state: State } | null>(null);
  const onFailureRef = useRef(onFailure);
  useEffect(() => {
    onFailureRef.current = onFailure;
  }, [onFailure]);

  const q = query.trim();
  const key = `${attempt}|${q}`;
  const state: State =
    q.length < 2 ? { s: "idle" } : answer?.key === key ? answer.state : { s: "loading" };
  const count =
    state.s === "ok"
      ? t("count", { n: state.items.length })
      : state.s === "empty"
        ? t("none")
        : state.s === "down"
          ? t("downShort")
          : "";

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const r = await searchArtistsAction(q);
      if (cancelled) return;
      if (r.ok) {
        const items = r.results ?? [];
        setAnswer({ key, state: items.length ? { s: "ok", items } : { s: "empty" } });
      } else if (r.reason === "catalog") {
        setAnswer({ key, state: { s: "down" } });
      } else {
        setAnswer({ key, state: { s: "idle" } });
        onFailureRef.current(r.reason);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, key]);

  return (
    <>
      <div className="input-wrap has-prefix">
        <span className="prefix" aria-hidden="true">
          <IconSearch />
        </span>
        <input
          className="input"
          id={inputId}
          type="search"
          autoComplete="off"
          maxLength={100}
          value={query}
          disabled={disabled}
          aria-describedby={`${inputId}-hint`}
          aria-controls={`${inputId}-results`}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="help" id={`${inputId}-hint`}>
        {t("hint")}
      </p>
      <ul
        className="results"
        id={`${inputId}-results`}
        aria-label={t("resultsLabel")}
        aria-busy={state.s === "loading" || undefined}
      >
        {state.s === "idle" ? <li className="hint">{t("idle")}</li> : null}
        {state.s === "loading"
          ? [0, 1, 2].map((i) => (
              <li key={i} className="result-skel" aria-hidden="true">
                <span />
                <span />
                <span />
              </li>
            ))
          : null}
        {state.s === "empty" ? <li className="hint">{t("empty", { q })}</li> : null}
        {state.s === "down" ? (
          <li className="cat-err">
            <IconWarning />
            <div>
              <p>
                <b>{t("down")}</b> {t("downKept")}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setAttempt((n) => n + 1)}
              >
                {t("retry")}
              </button>
            </div>
          </li>
        ) : null}
        {state.s === "ok"
          ? state.items.map((a) => {
              const on = (markSaved && a.picked) || pickedMbids.has(a.mbid);
              const meta = artistMeta(a);
              return (
                <li key={a.mbid}>
                  <button
                    type="button"
                    className="result"
                    data-k={`art-${a.mbid}`}
                    aria-disabled={on || disabled || undefined}
                    onClick={() => {
                      if (!on && !disabled) onPick(a);
                    }}
                  >
                    <ArtistTile name={a.name} photo={a.photoId} />
                    <span className="r-body">
                      <span className="r-title">{a.name}</span>
                      {meta ? <span className="r-meta">{meta}</span> : null}
                    </span>
                    <span className="r-add">
                      {on ? <IconCheck /> : <IconPlus />}
                      <span className="sr-only">{on ? t("added") : t("add")}</span>
                    </span>
                  </button>
                </li>
              );
            })
          : null}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {count}
      </p>
    </>
  );
}
