// Image rules (step 5.11), pure: the kinds, the limits (D-078: JPG, PNG or WebP up to 5 MB; D-121: at most 2048 px,
// no animation kept), the format sniff, the crop arithmetic and the Commons licence filter (D-118 (3)). Nothing
// here touches storage or the database, so the unit tests cover it without either.

export const MEDIA_KINDS = [
  "profile_photo",
  "artist_photo",
  "answer_image",
  "comment_image",
  "feedback_screenshot",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const isMediaKind = (v: unknown): v is MediaKind =>
  typeof v === "string" && (MEDIA_KINDS as readonly string[]).includes(v);

/** D-078: the upload limit (the owner lowered it from 8 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/**
 * Decompression bombs: refuse anything that would decode to more pixels than this (6000 × 4000, a 24 MP phone photo).
 * Review 5.11 H1: a flat 40 MP PNG of 166 KB took about 260 MB to decode; the output is at most 2048 px anyway.
 */
export const MAX_INPUT_PIXELS = 24_000_000;
/** D-121: the long edge of a member image after re-encoding. */
export const POST_IMAGE_EDGE = 2048;
/** Screenshots keep enough detail to read, no more. */
export const SCREENSHOT_EDGE = 2048;
/** The stored square of a profile photo; shown at 96 px and below (2× for sharp screens is 192). */
export const PROFILE_PHOTO_EDGE = 512;
/** The stored square of an artist photo (D-118 (1): 96 px in the header). */
export const ARTIST_PHOTO_EDGE = 512;
/** D-121 (2): a portrait image is shown at most 4:5 (the full image opens in the viewer). */
export const PORTRAIT_CAP = 4 / 5;
/** D-121 (3): the optional "Opis slike". */
export const ALT_MAX = 300;
/** D-118 (6): a feedback screenshot lives at most this long, handled or not. */
export const SCREENSHOT_DAYS = 90;
/** D-046 (2), D-118: artist photos are checked again after this many days. */
export const ARTIST_PHOTO_REFRESH_DAYS = 30;

export type ImageFormat = "jpeg" | "png" | "webp";
export const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * The format from the first bytes, never from the file name or the browser's type. Anything else (GIF, SVG, HTML,
 * HEIC, a ZIP) is refused before the decoder sees it.
 */
export function sniffImage(bytes: Uint8Array): ImageFormat | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return "png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && // R
    b[1] === 0x49 && // I
    b[2] === 0x46 && // F
    b[3] === 0x46 && // F
    b[8] === 0x57 && // W
    b[9] === 0x45 && // E
    b[10] === 0x42 && // B
    b[11] === 0x50 // P
  )
    return "webp";
  return null;
}

export type UploadProblem = "empty" | "tooLarge" | "format" | "busy";

/** The checks that need no decoder: size and the sniffed format. */
export function checkUpload(
  bytes: Uint8Array,
): { ok: true; format: ImageFormat } | { ok: false; problem: UploadProblem } {
  if (bytes.length === 0) return { ok: false, problem: "empty" };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, problem: "tooLarge" };
  const format = sniffImage(bytes);
  if (!format) return { ok: false, problem: "format" };
  return { ok: true, format };
}

/** A crop chosen in the sheet (D-078 (4)), as fractions of the oriented image: a square that stays inside it. */
export type CropBox = { x: number; y: number; size: number };

/**
 * Turns the fractions into whole pixels for an image of `w` × `h` (after EXIF rotation). The square is clamped
 * inside the image; a missing or malformed crop means the centred largest square.
 */
export function cropPixels(
  crop: CropBox | null,
  w: number,
  h: number,
): { left: number; top: number; size: number } {
  const short = Math.min(w, h);
  const valid =
    crop &&
    [crop.x, crop.y, crop.size].every((n) => Number.isFinite(n)) &&
    crop.size > 0 &&
    crop.size <= 1;
  if (!valid) {
    return { left: Math.floor((w - short) / 2), top: Math.floor((h - short) / 2), size: short };
  }
  // `size` is a fraction of the short edge; x and y of the full width and height.
  const size = Math.max(1, Math.min(short, Math.round(crop.size * short)));
  const left = Math.min(Math.max(0, Math.round(crop.x * w)), w - size);
  const top = Math.min(Math.max(0, Math.round(crop.y * h)), h - size);
  return { left, top, size };
}

/** Parses the crop the sheet sends ("x,y,size" as fractions). */
export function parseCrop(raw: unknown): CropBox | null {
  if (typeof raw !== "string") return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 1)) return null;
  const [x, y, size] = parts as [number, number, number];
  return { x, y, size };
}

/**
 * D-118 (1): an artist photo becomes a square "towards the upper third", so faces in portrait photos stay in the
 * circle; a landscape photo is centred.
 */
export function artistSquare(w: number, h: number): { left: number; top: number; size: number } {
  const size = Math.min(w, h);
  if (h > w) return { left: 0, top: Math.floor((h - w) / 3), size };
  return { left: Math.floor((w - h) / 2), top: 0, size };
}

/** D-121 (3): the description is optional, single-line, trimmed and capped; empty means "use the name". */
export function cleanAlt(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Control characters and line breaks become spaces; runs of spaces collapse.
  const text = raw
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return [...text].slice(0, ALT_MAX).join("");
}

// ------------------------------------------------------------------ Commons licences (D-118 (3))

export type LicenceVerdict = { ok: true; short: string } | { ok: false };

/**
 * Public domain, CC0, CC BY and CC BY-SA in every version are accepted; GFDL-only, non-commercial, no-derivatives,
 * "fair use" and anything unknown are not. Commons sends `LicenseShortName` such as "CC BY-SA 4.0", "CC0",
 * "Public domain", "GFDL"; a file under GFDL and CC BY-SA reports the CC licence it may be reused under.
 */
export function acceptLicence(shortName: string | null | undefined): LicenceVerdict {
  const s = (shortName ?? "").trim();
  if (!s) return { ok: false };
  const n = s.toLowerCase().replace(/\s+/g, " ");
  if (/\b(nc|nd)\b|non-?commercial|no-?deriv|fair use|copyrighted|all rights reserved/.test(n))
    return { ok: false };
  if (n === "cc0" || n.startsWith("cc0 ") || n === "cc-zero") return { ok: true, short: "CC0" };
  if (n === "public domain" || n === "pd" || n.startsWith("pd-") || n.startsWith("public domain "))
    return { ok: true, short: "Public domain" };
  const m = /^cc[ -]by(?:[ -](sa))?(?:[ -]([0-9.]+))?(?:[ -]([a-z-]+))?$/.exec(n);
  if (m) {
    const sa = m[1] ? "-SA" : "";
    const version = m[2] ? ` ${m[2]}` : "";
    const port = m[3] ? ` ${m[3].toUpperCase()}` : "";
    return { ok: true, short: `CC BY${sa}${version}${port}` };
  }
  return { ok: false }; // GFDL, GPL, "Attribution" without a CC licence, anything else
}

/** Commons' Artist field is HTML; the credit shows plain text only, never markup from a third party. */
export function plainText(html: string | null | undefined, max = 200): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return [...text].slice(0, max).join("");
}

/** Only links to the licence's own host or to Commons are shown; anything else is dropped (no third-party URLs). */
export function safeLicenceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();
    if (
      host === "creativecommons.org" ||
      host.endsWith(".creativecommons.org") ||
      host === "commons.wikimedia.org"
    )
      return `https://${host}${u.pathname}${u.search}`;
    return null;
  } catch {
    return null;
  }
}

/**
 * CC 2.0, 2.5 and 3.0 end on any breach and ask for the title and a credit for the adaptation (research E.2 (a));
 * small tiles show only photos whose licence needs no credit next to them, or 4.0 (RECOMMENDED option B, see
 * docs/legal/research/E-copyright-music-trademarks.md item 13). Public domain and CC0 need no credit at all.
 */
export function tileSafe(licence: string): boolean {
  if (licence === "CC0" || licence === "Public domain") return true;
  return / 4\.0\b/.test(licence);
}

export const isShareAlike = (licence: string) => licence.startsWith("CC BY-SA");
/** CC 2.x and 3.0: the credit names the adaptation as well (research E.2, item 3). */
export const isOldCc = (licence: string) => /^CC BY(-SA)? [23]\./.test(licence);

/** Commons files we never crop: watermarked or carrying a credit inside the picture (research E.2, item 5). */
export function cropForbidden(restrictions: string | null | undefined): boolean {
  return /watermark/i.test(restrictions ?? "");
}

/** The title shown in the credit: ObjectName, or the file name without "File:" and its extension. */
export function photoTitle(objectName: string | null, file: string): string {
  const fromName = plainText(objectName, 150);
  if (fromName) return fromName;
  return file
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/_/g, " ")
    .slice(0, 150);
}
