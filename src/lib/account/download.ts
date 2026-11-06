import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// The signed download link for a data copy (plan §1.2 "downloadable for 24 hours through a signed link"). The
// signature binds the request id, the owner and the expiry, so a link copied out of one account, or kept past its
// time, is refused before the database is asked. The route also requires the owner's session.

const sign = (id: string, userId: string, exp: number) =>
  createHmac("sha256", env().BETTER_AUTH_SECRET)
    .update(`export:${id}:${userId}:${exp}`)
    .digest("base64url");

/** `/api/export/<id>?e=<unix seconds>&s=<signature>` */
export function exportDownloadPath(id: string, userId: string, expiresAt: Date): string {
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return `/api/export/${id}?e=${exp}&s=${sign(id, userId, exp)}`;
}

export function verifyExportSignature(
  id: string,
  userId: string,
  e: string | null,
  s: string | null,
  now = new Date(),
): boolean {
  if (!e || !s || !/^\d{1,12}$/.test(e)) return false;
  const exp = Number(e);
  if (exp * 1000 <= now.getTime()) return false;
  const want = Buffer.from(sign(id, userId, exp));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got);
}
