// Database errors without personal data (step 5.2 review M1). drizzle-orm wraps driver errors in a
// DrizzleQueryError whose message contains the query parameters, i.e. what a member wrote. Only the PostgreSQL
// error code and the constraint name are ever logged or rethrown.

type PgLike = { code?: string; constraint?: string; cause?: PgLike };

export function pgCode(e: unknown): string | undefined {
  const err = e as PgLike | undefined;
  return err?.code ?? err?.cause?.code;
}

export const isUniqueViolation = (e: unknown) => pgCode(e) === "23505";

/** A safe summary: "23505 daily_drop_answer_one_uq". */
export function dbErrorSummary(e: unknown): string {
  const err = e as PgLike | undefined;
  const constraint = err?.constraint ?? err?.cause?.constraint;
  return [pgCode(e) ?? "unknown", constraint].filter(Boolean).join(" ");
}

export function logDbError(where: string, e: unknown): void {
  console.error(`[db] ${where}: ${dbErrorSummary(e)}`);
}

/** Rethrow without the parameters, so Next's error log never holds member content. */
export class SafeDbError extends Error {
  constructor(where: string, e: unknown) {
    super(`database error in ${where}: ${dbErrorSummary(e)}`);
    this.name = "SafeDbError";
  }
}
