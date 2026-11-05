// Music DNA limits (D-046 (1), D-078): 2 to 10 genres, up to 10 artists. Shared by the data layer and the editor.
export const GENRE_MIN = 2;
export const GENRE_MAX = 10;
export const ARTIST_MAX = 10;

/** The audiences offered for the Music DNA section (prototype SET-05 sheet; "mutuals" is not offered in the alpha). */
export const DNA_AUDIENCES = ["everyone", "followers", "me"] as const;
export type DnaAudience = (typeof DNA_AUDIENCES)[number];
