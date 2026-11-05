import { genreColour } from "@/lib/music/genre-traits";

export type RingGenre = { name: string; traitKey: string | null };

/**
 * Avatar fallback (components §4.6, D-017): the first letter of the display name on bg.high inside a ring of the
 * member's genre colours (D-052). The ring is drawn only from genres the viewer may see (the Music DNA section),
 * else it stays neutral, so the ring never tells a visitor what the section would not. Decorative: the name is
 * always next to it. Photos arrive with step 5.11.
 */
export function Avatar({
  name,
  genres = [],
  size = "md",
}: {
  name: string;
  genres?: RingGenre[];
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const letter = [...name.trim()][0]?.toUpperCase() ?? "?";
  const colours = genres.slice(0, 4).map((g) => genreColour(g.name, g.traitKey));
  const ring =
    colours.length === 0
      ? undefined
      : colours.length === 1
        ? colours[0]
        : `conic-gradient(from 210deg, ${[...colours, colours[0]].join(", ")})`;
  return (
    <span
      className={`avatar ${size}`}
      style={ring ? ({ "--ring": ring } as React.CSSProperties) : undefined}
      aria-hidden="true"
    >
      <span>{letter}</span>
    </span>
  );
}
