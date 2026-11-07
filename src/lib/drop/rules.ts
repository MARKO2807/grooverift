// Daily Drop rules for members (step 5.7). A pure module: client components import it, never src/lib/data
// (session 28 lesson). The data layer keeps its own copies of the limits for the database checks.

/** daily_drop_answer_len (plan §1.2). */
export const ANSWER_MAX = 1500;
/** comment_len (plan §1.2). */
export const COMMENT_MAX = 750;

export type Sort = "foryou" | "recent" | "discussed";
export const SORTS: readonly Sort[] = ["foryou", "recent", "discussed"];
export const asSort = (v: unknown): Sort => (SORTS.includes(v as Sort) ? (v as Sort) : "foryou");

/** Answers shown per step on the question page; "Prikaži još" adds the next batch. */
export const PAGE_SIZE = 30;

/** How often an open question page asks whether new answers arrived (J3 E3), in milliseconds. */
export const POLL_MS = 60_000;

/** A long answer is collapsed with "Pročitaj više" after this many characters (J3 E14). */
export const CLAMP_CHARS = 280;

export type DropFailure =
  | "signedOut"
  | "notAllowed"
  | "notAvailable"
  | "alreadyAnswered"
  | "tooMany"
  | "paused"
  | "tooLong"
  | "empty"
  | "restricted"
  | "generic"
  | "imageTooLarge"
  | "imageFormat"
  | "imageOff"
  | "imageBusy";

/** D-121: an answer's or comment's image as the client sees it (served by /api/media/<id>). */
export type PostImageData = { id: string; width: number; height: number; alt: string | null };
/** D-119 (6): an artist card as the client sees it. */
export type ArtistCardData = { id: string; name: string; photoId: string | null };
/** D-119 (6): at most five cards per answer or comment. */
export const CARDS_MAX = 5;

/** An answer as the client components receive it (dates as ISO strings). */
export type AnswerCardData = {
  id: string;
  author: { id: string; username: string; displayName: string; photoId?: string | null };
  body: string;
  language: string | null;
  createdAt: string;
  edited: boolean;
  mine: boolean;
  muted: boolean;
  reactions: number;
  reacted: boolean;
  comments: number;
  image: PostImageData | null;
  artists: ArtistCardData[];
};
