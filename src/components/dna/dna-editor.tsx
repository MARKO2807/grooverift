"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Spirala } from "@/components/motifs/spirala";
import { Dialog } from "@/components/ui/dialog";
import {
  IconCaretDown,
  IconCaretUp,
  IconCheck,
  IconLock,
  IconOffline,
  IconPlus,
  IconSearch,
  IconUser,
  IconUsers,
  IconX,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { ArtistSearch } from "./artist-search";
import { ArtistTile } from "./artist-tile";
import type { ArtistOption, DnaArtist, DnaAudienceState, MusicDna } from "@/lib/data/music-dna";
import {
  addArtistAction,
  addGenreAction,
  moveDnaAction,
  removeDnaAction,
  searchGenresAction,
  setDnaAudienceAction,
  type DnaActionResult,
  type DnaFailure,
} from "@/lib/music/actions";
import { SEARCH_LIMIT, type GenreOption } from "@/lib/music/genre-search";
import { genreColour } from "@/lib/music/genre-traits";
import {
  ARTIST_MAX,
  DNA_AUDIENCES,
  GENRE_MAX,
  GENRE_MIN,
  type DnaAudience,
} from "@/lib/music/limits";

// PROF-09, the Music DNA editor (J2, D-078): rows with Move up / Move down / Remove (owner choice A), every change
// saved at once and announced in a live region, Remove with Undo in a 5 s toast, at most 10 genres and at least
// two, the audience written out with "Change" (the SET-05 sheet). Only the member changes anything (invariant 3).

// i18n-keys: dna.audience.everyone dna.audience.followers dna.audience.mutuals dna.audience.me
// i18n-keys: dna.audienceOption.everyone dna.audienceOption.followers dna.audienceOption.me
// i18n-keys: dna.audienceDesc.everyone dna.audienceDesc.followers dna.audienceDesc.me
// i18n-keys: dna.error.duplicate dna.error.full dna.error.minimum dna.error.stale dna.error.notFound
// i18n-keys: dna.error.tooMany dna.error.signedOut dna.error.notAllowed dna.error.paused dna.error.generic
// i18n-keys: dna.error.catalog dna.error.fullArtists dna.error.duplicateArtist dna.error.notFoundArtist
const ERROR_KEY: Record<DnaFailure, string> = {
  duplicate: "duplicate",
  full: "full",
  minimum: "minimum",
  stale: "stale",
  "not-found": "notFound",
  tooMany: "tooMany",
  signedOut: "signedOut",
  notAllowed: "notAllowed",
  paused: "paused",
  generic: "generic",
  catalog: "catalog",
};

type Kind = "genre" | "artist";
type Row = { entryId: string; name: string };

type Failure = { text: string; retry?: () => void };

export function DnaEditor({
  initial,
  audience: initialAudience,
  suggestions,
}: {
  initial: MusicDna;
  audience: DnaAudienceState;
  suggestions: GenreOption[];
}) {
  const t = useTranslations("dna");
  const toast = useToast();
  const [dna, setDna] = useState(initial);
  const [audience, setAudience] = useState(initialAudience);
  const [adding, setAdding] = useState(false);
  const [addingArtist, setAddingArtist] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GenreOption[] | null>(null);
  const [live, setLive] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [offline, setOffline] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  // J2 E2: read-only while offline, with a banner.
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const focus = useCallback((selector: string) => {
    requestAnimationFrame(() => box.current?.querySelector<HTMLElement>(selector)?.focus());
  }, []);

  const announce = (text: string) => {
    // A repeated message must still be read: clear first, then set.
    setLive("");
    requestAnimationFrame(() => setLive(text));
  };

  const errorText = (reason: DnaFailure | undefined, kind: Kind = "genre") => {
    if (kind === "artist" && reason === "full") return t("error.fullArtists", { max: ARTIST_MAX });
    if (kind === "artist" && reason === "duplicate") return t("error.duplicateArtist");
    if (kind === "artist" && reason === "not-found") return t("error.notFoundArtist");
    return t(`error.${ERROR_KEY[reason ?? "generic"]}`, { max: GENRE_MAX });
  };

  /** Applies a server answer: the list always follows the server, a failure is shown with Retry where it helps. */
  const settle = (r: DnaActionResult, retry?: () => void, kind: Kind = "genre") => {
    if (r.dna) setDna(r.dna);
    if (r.ok) {
      setFailure(null);
      return true;
    }
    const retryable = r.reason === "generic" || r.reason === "tooMany" || r.reason === "catalog";
    setFailure({ text: errorText(r.reason, kind), retry: retryable ? retry : undefined });
    return false;
  };

  const picked = new Set(dna.genres.map((g) => g.id));
  const artistFull = dna.artists.length >= ARTIST_MAX;
  const genreFull = dna.genres.length >= GENRE_MAX;
  const atMinimum = dna.genres.length <= GENRE_MIN;

  // ---------------------------------------------------------------- search
  useEffect(() => {
    if (!adding) return;
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const r = await searchGenresAction(q);
      if (cancelled) return;
      if (r.ok) setResults(r.results ?? []);
      else setFailure({ text: errorText(r.reason) });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- errorText only reads translations
  }, [query, adding]);

  // An empty field shows the suggestions; results are kept only for a typed query.
  const typed = query.trim() ? results : null;
  const shown = (typed ?? suggestions).filter((g) => !picked.has(g.id)).slice(0, SEARCH_LIMIT);

  // ---------------------------------------------------------------- actions
  const add = (g: GenreOption) => {
    const go = () =>
      startTransition(async () => {
        const r = await addGenreAction(g.id);
        if (settle(r, go)) {
          announce(t("added", { name: g.name }));
          setQuery("");
          setResults(null);
          focus("#f-genre");
        } else if (r.reason === "duplicate" && r.entryId) {
          focus(`[data-k="rm-${r.entryId}"]`);
        }
      });
    go();
  };

  const addArtist = (a: ArtistOption) => {
    const go = () =>
      startTransition(async () => {
        const r = await addArtistAction("mb", a.mbid);
        if (settle(r, go, "artist")) {
          announce(t("added", { name: a.name }));
          if (r.entryId) focus(`[data-k="rm-${r.entryId}"]`);
        } else if (r.reason === "duplicate" && r.entryId) {
          focus(`[data-k="rm-${r.entryId}"]`);
        }
      });
    go();
  };

  const remove = (kind: Kind, g: Row, index: number) => {
    const go = () =>
      startTransition(async () => {
        const r = await removeDnaAction(g.entryId);
        if (!settle(r, go, kind)) return;
        announce(t("removed", { name: g.name }));
        const rest: Row[] = (kind === "genre" ? r.dna?.genres : r.dna?.artists) ?? [];
        const next = rest[Math.min(index, rest.length - 1)];
        focus(next ? `[data-k="rm-${next.entryId}"]` : `[data-k="dna-add-${kind}"]`);
        const removed = r.removed;
        if (removed?.kind === kind) {
          toast.show(t("removed", { name: g.name }), {
            label: t("undo"),
            onPress: () =>
              startTransition(async () => {
                const u =
                  kind === "genre"
                    ? await addGenreAction(removed.subjectId, removed.position)
                    : await addArtistAction("id", removed.subjectId, removed.position);
                if (settle(u, undefined, kind)) {
                  announce(t("restored", { name: g.name }));
                  if (u.entryId) focus(`[data-k="rm-${u.entryId}"]`);
                }
              }),
          });
        }
      });
    go();
  };

  const move = (kind: Kind, g: Row, index: number, direction: -1 | 1) => {
    const before = dna;
    const list: Row[] = kind === "genre" ? before.genres : before.artists;
    const expected = list.map((x) => x.entryId);
    const j = index + direction;
    if (j < 0 || j >= list.length) return;
    // Optimistic for reorder only (J2 E1); a failure rolls back visibly.
    if (kind === "genre") {
      const genres = [...before.genres];
      [genres[index], genres[j]] = [genres[j]!, genres[index]!];
      setDna({ ...before, genres });
    } else {
      const artists = [...before.artists];
      [artists[index], artists[j]] = [artists[j]!, artists[index]!];
      setDna({ ...before, artists });
    }
    const edge = j === 0 || j === list.length - 1;
    const same = `[data-k="${direction < 0 ? "up" : "down"}-${g.entryId}"]`;
    const other = `[data-k="${direction < 0 ? "down" : "up"}-${g.entryId}"]`;
    focus(edge ? other : same);
    announce(t("moved", { name: g.name, n: j + 1 }));
    startTransition(async () => {
      const r = await moveDnaAction(g.entryId, direction, expected);
      if (!r.ok && !r.dna) setDna(before);
      settle(r, () => move(kind, g, index, direction), kind);
    });
  };

  const saveAudience = (value: DnaAudience) =>
    startTransition(async () => {
      const r = await setDnaAudienceAction(value);
      if (settle(r)) {
        setAudience((a) => ({ ...a, audience: value }));
        setSheet(false);
        toast.show(t("audienceSaved", { who: t(`audience.${value}`) }));
        focus(`[data-k="dna-aud"]`);
      }
    });

  const locked = offline;
  const AudIcon =
    audience.audience === "me"
      ? IconLock
      : audience.audience === "followers"
        ? IconUser
        : IconUsers;

  return (
    <div className="dna-editor" ref={box} aria-busy={pending || undefined}>
      {offline ? (
        <p className="notice dna-offline">
          <IconOffline />
          <span>{t("offline")}</span>
        </p>
      ) : null}

      {dna.genres.length ? (
        <Spirala
          genres={dna.genres.map((g) => ({ name: g.name, traitKey: g.traitKey, key: g.slug }))}
          caption={t("title")}
          captionHidden
          height={150}
          intro={false}
        />
      ) : (
        <p className="dna-empty">{t("emptySpirala")}</p>
      )}

      <p className="aud-line">
        <AudIcon />
        <span>
          {t.rich("audienceLine", {
            who: t(`audience.${audience.audience}`),
            b: (c) => <b>{c}</b>,
          })}
        </span>
        <button
          type="button"
          className="link"
          data-k="dna-aud"
          aria-label={t("changeAudience")}
          disabled={locked}
          onClick={() => setSheet(true)}
        >
          {t("change")}
        </button>
      </p>
      {audience.profilePrivate && audience.audience === "everyone" ? (
        <p className="hint">{t("privateNote")}</p>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>
      {failure ? (
        <div className="post-err dna-fail" role="alert">
          <span>{failure.text}</span>
          {failure.retry ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={failure.retry}>
              {t("retry")}
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="set-group dna-sec" aria-labelledby="h-dgenre">
        <h2 className="set-gt" id="h-dgenre">
          {t("genres")}{" "}
          <span className="count">{t("count", { n: dna.genres.length, max: GENRE_MAX })}</span>
        </h2>
        <p className="hint dna-order">{t("orderHint")}</p>
        {dna.genres.length ? (
          <ol className="dna-rows" aria-label={t("genresOrder")}>
            {dna.genres.map((g, i) => (
              <li
                key={g.entryId}
                className="dna-row"
                style={{ "--g": genreColour(g.name, g.traitKey) } as React.CSSProperties}
              >
                <span className="dna-swatch" aria-hidden="true" />
                <span className="dna-pos" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="dna-name">
                  {g.name}
                  {g.parentName ? <span className="dna-fam"> · {g.parentName}</span> : null}
                  <span className="sr-only">, {t("position", { n: i + 1 })}</span>
                </span>
                <span className="dna-btns">
                  <button
                    type="button"
                    className="iconbtn sm"
                    data-k={`up-${g.entryId}`}
                    aria-label={t("moveUp", { name: g.name })}
                    disabled={i === 0 || locked}
                    onClick={() => move("genre", g, i, -1)}
                  >
                    <IconCaretUp />
                  </button>
                  <button
                    type="button"
                    className="iconbtn sm"
                    data-k={`down-${g.entryId}`}
                    aria-label={t("moveDown", { name: g.name })}
                    disabled={i === dna.genres.length - 1 || locked}
                    onClick={() => move("genre", g, i, 1)}
                  >
                    <IconCaretDown />
                  </button>
                  <button
                    type="button"
                    className="iconbtn sm dna-x"
                    data-k={`rm-${g.entryId}`}
                    aria-label={t("remove", { name: g.name })}
                    aria-disabled={atMinimum || locked || undefined}
                    aria-describedby={atMinimum ? "dna-min-hint" : undefined}
                    onClick={() => {
                      if (locked) return;
                      if (atMinimum) {
                        setFailure({ text: errorText("minimum") });
                        return;
                      }
                      remove("genre", g, i);
                    }}
                  >
                    <IconX />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="set-empty">{t("noGenres")}</p>
        )}
        {atMinimum && dna.genres.length ? (
          <p className="hint" id="dna-min-hint">
            {t("minHint")}
          </p>
        ) : null}

        {genreFull ? (
          <p className="hint">{t("fullGenres", { max: GENRE_MAX })}</p>
        ) : adding ? (
          <div className="dna-add" id="dna-add">
            <div className="dna-add-head">
              <label className="label" htmlFor="f-genre">
                {t("searchLabel")}
              </label>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setAdding(false);
                  setQuery("");
                  setResults(null);
                  focus(`[data-k="dna-add-genre"]`);
                }}
              >
                {t("close")}
              </button>
            </div>
            <div className="input-wrap has-prefix">
              <span className="prefix" aria-hidden="true">
                <IconSearch />
              </span>
              <input
                className="input"
                id="f-genre"
                type="search"
                autoComplete="off"
                maxLength={60}
                value={query}
                disabled={locked}
                aria-describedby="genre-hint"
                aria-controls="genre-results"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="help" id="genre-hint">
              {t("searchHint")}
            </p>
            {shown.length ? (
              <div
                className="g-grid"
                id="genre-results"
                role="group"
                aria-label={typed ? t("resultsLabel") : t("suggestionsLabel")}
              >
                {shown.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="chip chip-genre"
                    aria-label={g.parentName ? `${g.name}, ${g.parentName}` : g.name}
                    style={{ "--g": genreColour(g.name, g.traitKey) } as React.CSSProperties}
                    disabled={locked || pending}
                    onClick={() => add(g)}
                  >
                    <span className="g-txt">
                      <span className="g-n">{g.name}</span>
                      {g.parentName ? (
                        <span className="g-fam" aria-hidden="true">
                          {g.parentName}
                        </span>
                      ) : null}
                    </span>
                    <span className="ck" aria-hidden="true">
                      <IconPlus />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="hint" id="genre-results">
                {t("noResults")}
              </p>
            )}
            {typed && typed.length >= SEARCH_LIMIT ? (
              <p className="hint">{t("moreResults")}</p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm dna-addbtn"
            data-k="dna-add-genre"
            disabled={locked}
            onClick={() => {
              setAdding(true);
              focus("#f-genre");
            }}
          >
            <IconPlus />
            {t("addGenre")}
          </button>
        )}
      </section>

      <section className="set-group dna-sec" aria-labelledby="h-dartist">
        <h2 className="set-gt" id="h-dartist">
          {t("artists")}{" "}
          <span className="count">{t("count", { n: dna.artists.length, max: ARTIST_MAX })}</span>
        </h2>
        {dna.artists.length ? (
          <ol className="dna-rows" aria-label={t("artistsOrder")}>
            {dna.artists.map((a: DnaArtist, i) => (
              <li key={a.entryId} className="dna-row dna-row-artist">
                <ArtistTile name={a.name} size="sm" />
                <span className="dna-pos" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="dna-name">
                  {a.name}
                  {a.unavailable ? (
                    <span className="dna-fam"> · {t("unavailable")}</span>
                  ) : a.disambiguation ? (
                    <span className="dna-fam"> · {a.disambiguation}</span>
                  ) : null}
                  <span className="sr-only">, {t("position", { n: i + 1 })}</span>
                </span>
                <span className="dna-btns">
                  <button
                    type="button"
                    className="iconbtn sm"
                    data-k={`up-${a.entryId}`}
                    aria-label={t("moveUp", { name: a.name })}
                    disabled={i === 0 || locked}
                    onClick={() => move("artist", a, i, -1)}
                  >
                    <IconCaretUp />
                  </button>
                  <button
                    type="button"
                    className="iconbtn sm"
                    data-k={`down-${a.entryId}`}
                    aria-label={t("moveDown", { name: a.name })}
                    disabled={i === dna.artists.length - 1 || locked}
                    onClick={() => move("artist", a, i, 1)}
                  >
                    <IconCaretDown />
                  </button>
                  <button
                    type="button"
                    className="iconbtn sm dna-x"
                    data-k={`rm-${a.entryId}`}
                    aria-label={t("remove", { name: a.name })}
                    disabled={locked}
                    onClick={() => remove("artist", a, i)}
                  >
                    <IconX />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="set-empty">{t("noArtists")}</p>
        )}

        {artistFull ? (
          <p className="hint">{t("fullArtists", { max: ARTIST_MAX })}</p>
        ) : addingArtist ? (
          <div className="dna-add" id="dna-add-artist-panel">
            <div className="dna-add-head">
              <label className="label" htmlFor="f-artist">
                {t("artist.searchLabel")}
              </label>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setAddingArtist(false);
                  focus(`[data-k="dna-add-artist"]`);
                }}
              >
                {t("close")}
              </button>
            </div>
            <ArtistSearch
              inputId="f-artist"
              disabled={locked || pending}
              pickedMbids={new Set(dna.artists.flatMap((a) => (a.mbid ? [a.mbid] : [])))}
              onPick={addArtist}
              onFailure={(reason) => setFailure({ text: errorText(reason, "artist") })}
            />
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm dna-addbtn"
            data-k="dna-add-artist"
            disabled={locked}
            onClick={() => {
              setAddingArtist(true);
              focus("#f-artist");
            }}
          >
            <IconPlus />
            {t("addArtist")}
          </button>
        )}
      </section>

      <p className="meta">{t("saveNote")}</p>

      <Dialog title={t("audienceTitle")} isOpen={sheet} onOpenChange={setSheet}>
        {(close) => (
          <AudienceForm
            value={audience.audience}
            pending={pending}
            onCancel={close}
            onSave={saveAudience}
          />
        )}
      </Dialog>
    </div>
  );
}

function AudienceForm({
  value,
  pending,
  onCancel,
  onSave,
}: {
  value: DnaAudience | "mutuals";
  pending: boolean;
  onCancel: () => void;
  onSave: (v: DnaAudience) => void;
}) {
  const t = useTranslations("dna");
  const [choice, setChoice] = useState<DnaAudience | null>(
    DNA_AUDIENCES.includes(value as DnaAudience) ? (value as DnaAudience) : null,
  );
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (choice) onSave(choice);
      }}
    >
      <fieldset className="choices">
        <legend className="sr-only">{t("audienceTitle")}</legend>
        {DNA_AUDIENCES.map((v) => (
          <label key={v} className="choice">
            <input
              type="radio"
              name="dna-audience"
              value={v}
              checked={choice === v}
              onChange={() => setChoice(v)}
            />
            <span className="choice-mark" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="choice-body">
              <span className="choice-title">{t(`audienceOption.${v}`)}</span>
              <span className="choice-desc">{t(`audienceDesc.${v}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="foot-row">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!choice || pending}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}
