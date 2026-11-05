import "server-only";
import type { AnswerView, CommentItem } from "@/lib/data/answers";
import type { CommentData } from "@/components/drop/comments";
import type { AnswerCardData } from "./rules";

// Server-side shaping of data-layer views for the client components: dates become ISO strings, and only the
// fields a card shows cross the boundary (never the author's privacy facts or graph).

export const toCard = (a: AnswerView): AnswerCardData => ({
  id: a.id,
  author: a.author,
  body: a.body,
  language: a.language,
  createdAt: a.createdAt.toISOString(),
  edited: !!a.editedAt,
  mine: a.mine,
  muted: a.muted,
  reactions: a.reactions,
  reacted: a.reacted,
  comments: a.comments,
});

export const toComment = (c: CommentItem): CommentData =>
  c.kind === "unavailable"
    ? { kind: "unavailable", id: c.id }
    : {
        kind: "comment",
        id: c.id,
        author: { username: c.author.username, displayName: c.author.displayName },
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        mine: c.mine,
        muted: c.muted,
      };

/** "četvrtak, 5. studenoga 2026." for a UTC calendar date, in the page's language. */
export function longDate(date: string, locale: string, weekday = true): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hr-HR", {
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export const dropLocale = (locale: string) => (locale === "en" ? "en" : "hr") as "hr" | "en";
