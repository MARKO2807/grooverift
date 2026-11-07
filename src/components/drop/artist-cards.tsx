"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArtistSearch } from "@/components/dna/artist-search";
import { ArtistTile } from "@/components/dna/artist-tile";
import { IconPlus, IconX } from "@/components/ui/icons";
import type { ArtistOption } from "@/lib/data/music-dna";
import { CARDS_MAX, type ArtistCardData } from "@/lib/drop/rules";

// Catalogue cards (the 5.7 remainder; D-068 (6), D-119 (6), (7)). In a post: up to five artists as small cards
// linking to CAT-01, with the photo where a tile may show one (D-118 (4)), else the generated tile. In the composer:
// "+ Dodaj izvođača" under the text field opens the same artist search as Music DNA; each choice becomes a chip with
// a remove button under the text. Nothing is fetched for the photo here: cards come with the post.

// i18n-keys: dna.error.signedOut dna.error.tooMany dna.error.paused dna.error.generic dna.error.notAllowed

export function ArtistCards({ artists }: { artists: ArtistCardData[] }) {
  const t = useTranslations("drop.cards");
  if (!artists.length) return null;
  return (
    <ul className="cards" aria-label={t("label")}>
      {artists.map((a) => (
        <li key={a.id}>
          <Link href={`/artist/${a.id}`} className="card-art">
            <ArtistTile name={a.name} size="sm" photo={a.photoId} />
            <span>{a.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A chosen card in the composer: a new one from the search ("mb:") or one the answer already had ("id:"). */
export type CardPick = { key: string; name: string; photoId: string | null };

export const picksFrom = (cards: ArtistCardData[]): CardPick[] =>
  cards.map((c) => ({ key: `id:${c.id}`, name: c.name, photoId: c.photoId }));

export function CardPicker({
  value,
  onChange,
}: {
  value: CardPick[];
  onChange: (next: CardPick[]) => void;
}) {
  const t = useTranslations("drop.cards");
  const td = useTranslations("dna");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const full = value.length >= CARDS_MAX;
  const picked = new Set(value.filter((v) => v.key.startsWith("mb:")).map((v) => v.key.slice(3)));

  const add = (a: ArtistOption) => {
    if (full || value.some((v) => v.key === `mb:${a.mbid}`)) return;
    onChange([...value, { key: `mb:${a.mbid}`, name: a.name, photoId: a.photoId }]);
    setLive(t("added", { name: a.name }));
    if (value.length + 1 >= CARDS_MAX) setOpen(false);
  };

  return (
    <div className="card-pick">
      {value.length ? (
        <ul className="chips" aria-label={t("chosen")}>
          {value.map((v) => (
            <li key={v.key} className="chip chip-art">
              <ArtistTile name={v.name} size="sm" photo={v.photoId} />
              <span>{v.name}</span>
              <button
                type="button"
                className="iconbtn chip-x"
                aria-label={t("remove", { name: v.name })}
                onClick={() => {
                  onChange(value.filter((x) => x.key !== v.key));
                  setLive(t("removed", { name: v.name }));
                }}
              >
                <IconX />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      {open && !full ? (
        <div className="card-search">
          <label className="label" htmlFor={`${id}-q`}>
            {t("searchLabel")}
          </label>
          <ArtistSearch
            inputId={`${id}-q`}
            disabled={false}
            pickedMbids={picked}
            markSaved={false}
            onPick={add}
            onFailure={(reason) =>
              setProblem(
                reason
                  ? td(
                      `error.${(["signedOut", "tooMany", "paused", "notAllowed"] as const).find((k) => k === reason) ?? "generic"}`,
                    )
                  : null,
              )
            }
          />
          {problem ? <p className="hint">{problem}</p> : null}
          <button type="button" className="link" onClick={() => setOpen(false)}>
            {t("done")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={full}
          aria-describedby={full ? `${id}-full` : undefined}
          onClick={() => setOpen(true)}
        >
          <IconPlus />
          {t("add")}
        </button>
      )}
      {full ? (
        <p className="hint" id={`${id}-full`}>
          {t("full", { max: CARDS_MAX })}
        </p>
      ) : null}
    </div>
  );
}
