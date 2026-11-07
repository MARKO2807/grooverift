"use server";

import { revalidatePath } from "next/cache";
import { getSession, roleOf } from "@/lib/auth/session";
import { setArtistPhotoHidden } from "@/lib/data/artist-photos";
import { logDbError } from "@/lib/data/db-errors";
import { loadViewer } from "@/lib/data/facts";
import { setProfilePhoto } from "@/lib/data/media";
import { consume } from "@/lib/data/rate-limit";
import type { Viewer } from "@/lib/authz";
import { processProfilePhoto } from "./process";
import { parseCrop } from "./rules";
import { fileBytes } from "./upload";

// Image actions (step 5.11). The member is always the session's own; the file is read here, size-checked again (the
// framework's body limit is a little larger than 5 MB) and re-encoded before anything is stored. Failures come back
// as a reason key for the component's messages.

// i18n-keys: media.error.signedOut media.error.notAllowed media.error.tooMany media.error.tooLarge
// i18n-keys: media.error.format media.error.decode media.error.empty media.error.generic

export type MediaFailure =
  "signedOut" | "notAllowed" | "tooMany" | "tooLarge" | "format" | "decode" | "empty" | "generic";
export type PhotoResult =
  { ok: true; photoId: string | null } | { ok: false; reason: MediaFailure };

async function activeMember(): Promise<
  { viewer: Viewer & { id: string } } | { fail: "signedOut" | "notAllowed" }
> {
  const session = await getSession();
  if (!session) return { fail: "signedOut" };
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  if (!viewer.id || viewer.status !== "active" || viewer.onboarded === false)
    return { fail: "notAllowed" };
  return { viewer: viewer as Viewer & { id: string } };
}

/** PROF-08 (D-078 (3), (4)): the photo with the square the member chose in the crop step. */
export async function uploadProfilePhotoAction(form: FormData): Promise<PhotoResult> {
  try {
    const m = await activeMember();
    if ("fail" in m) return { ok: false, reason: m.fail };
    if (!(await consume("upload", m.viewer.id)).allowed) return { ok: false, reason: "tooMany" };
    const bytes = await fileBytes(form.get("file"));
    if (typeof bytes === "string") return { ok: false, reason: bytes };
    const processed = await processProfilePhoto(bytes, parseCrop(form.get("crop")));
    if (!processed.ok) return { ok: false, reason: processed.problem };
    const r = await setProfilePhoto(m.viewer, processed.image);
    if (!r.ok) return { ok: false, reason: "notAllowed" };
    revalidatePath("/", "layout");
    return { ok: true, photoId: r.photoId };
  } catch (e) {
    logDbError("uploadProfilePhoto", e);
    return { ok: false, reason: "generic" };
  }
}

export async function removeProfilePhotoAction(): Promise<PhotoResult> {
  try {
    const m = await activeMember();
    if ("fail" in m) return { ok: false, reason: m.fail };
    if (!(await consume("profileEdit", m.viewer.id)).allowed)
      return { ok: false, reason: "tooMany" };
    const r = await setProfilePhoto(m.viewer, null);
    if (!r.ok) return { ok: false, reason: "notAllowed" };
    revalidatePath("/", "layout");
    return { ok: true, photoId: null };
  } catch (e) {
    logDbError("removeProfilePhoto", e);
    return { ok: false, reason: "generic" };
  }
}

// ------------------------------------------------------------------ artist photos, admin (D-118 (5))

export type HideResult =
  { ok: true } | { ok: false; reason: "notAllowed" | "invalid" | "tooMany" | "generic" };

/** "Sakrij fotografiju" / "Vrati fotografiju" on CAT-01: admins with a second factor only, with a reason to hide. */
export async function setArtistPhotoHiddenAction(
  artistId: string,
  hidden: boolean,
  reason: string,
): Promise<HideResult> {
  try {
    const session = await getSession();
    if (!session) return { ok: false, reason: "notAllowed" };
    const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
    if (viewer.role !== "admin" || viewer.status !== "active")
      return { ok: false, reason: "notAllowed" };
    if (!(await consume("artistPhoto", viewer.id!)).allowed)
      return { ok: false, reason: "tooMany" };
    const r = await setArtistPhotoHidden(viewer.id!, artistId, hidden, reason);
    if (!r.ok) return { ok: false, reason: r.reason === "invalid" ? "invalid" : "notAllowed" };
    revalidatePath(`/artist/${artistId}`);
    return { ok: true };
  } catch (e) {
    logDbError("setArtistPhotoHidden", e);
    return { ok: false, reason: "generic" };
  }
}
