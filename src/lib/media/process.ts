import sharp, { type Metadata, type Sharp } from "sharp";
import {
  ARTIST_PHOTO_EDGE,
  artistSquare,
  checkUpload,
  cropPixels,
  MAX_INPUT_PIXELS,
  POST_IMAGE_EDGE,
  PROFILE_PHOTO_EDGE,
  SCREENSHOT_EDGE,
  type CropBox,
  type UploadProblem,
} from "./rules";

// Re-encoding (step 5.11, D-078, D-121). Every stored image is decoded and written again as WebP: the original bytes
// never reach storage, so EXIF and GPS (sharp writes no metadata unless asked), trailing data of a polyglot file,
// colour profiles with payloads and extra frames of an animation are all gone. The decoder runs with a pixel limit
// (decompression bombs) and fails on corrupt input instead of guessing. One pipeline per image: rotate() applies
// the EXIF orientation, and an extract() after it cuts from the oriented picture (sharp applies them in call order).

export type Processed = { bytes: Buffer; width: number; height: number; contentType: "image/webp" };
export type ProcessResult =
  { ok: true; image: Processed } | { ok: false; problem: UploadProblem | "decode" };

const INPUT = { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error", animated: false } as const;
const WEBP = { quality: 82, effort: 4 } as const;

/** Width and height as the member sees the picture (EXIF orientations 5–8 swap them). */
function orientedSize(meta: Metadata): { width: number; height: number } {
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  return (meta.orientation ?? 1) >= 5 ? { width: h, height: w } : { width: w, height: h };
}

async function finish(pipeline: Sharp): Promise<Processed> {
  const { data, info } = await pipeline.webp(WEBP).toBuffer({ resolveWithObject: true });
  return { bytes: data, width: info.width, height: info.height, contentType: "image/webp" };
}

async function guarded(
  bytes: Buffer,
  run: (input: Buffer, size: { width: number; height: number }) => Promise<Processed>,
): Promise<ProcessResult> {
  const check = checkUpload(bytes);
  if (!check.ok) return check;
  try {
    const meta = await sharp(bytes, INPUT).metadata();
    // The sniffed format must be what the decoder found (a PNG header on a JPEG body is refused).
    if (meta.format !== check.format) return { ok: false, problem: "format" };
    const size = orientedSize(meta);
    if (!size.width || !size.height) return { ok: false, problem: "decode" };
    return { ok: true, image: await run(bytes, size) };
  } catch {
    return { ok: false, problem: "decode" };
  }
}

const inside = (input: Buffer, edge: number) =>
  sharp(input, INPUT)
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true });

/** A member image in an answer or comment (D-121): the whole image, long edge at most 2048 px. */
export function processPostImage(bytes: Buffer): Promise<ProcessResult> {
  return guarded(bytes, (input) => finish(inside(input, POST_IMAGE_EDGE)));
}

/** A feedback screenshot (D-078, D-118 (6)): the whole picture, readable, no metadata. */
export function processScreenshot(bytes: Buffer): Promise<ProcessResult> {
  return guarded(bytes, (input) => finish(inside(input, SCREENSHOT_EDGE)));
}

/** The profile photo (D-078 (3), (4)): the square the member chose in the crop step, 512 px. */
export function processProfilePhoto(bytes: Buffer, crop: CropBox | null): Promise<ProcessResult> {
  return guarded(bytes, (input, size) => {
    const c = cropPixels(crop, size.width, size.height);
    return finish(
      sharp(input, INPUT)
        .rotate()
        .extract({ left: c.left, top: c.top, width: c.size, height: c.size })
        .resize(PROFILE_PHOTO_EDGE, PROFILE_PHOTO_EDGE),
    );
  });
}

/**
 * An artist photo from Commons (D-118 (1)): a square towards the upper third, 512 px. The source is a Commons
 * thumbnail, not a member upload, but it goes through the same decoder limits; any of the three formats is fine.
 */
export async function processArtistPhoto(bytes: Buffer): Promise<ProcessResult> {
  if (bytes.length === 0 || bytes.length > 15 * 1024 * 1024)
    return { ok: false, problem: "tooLarge" };
  try {
    const meta = await sharp(bytes, INPUT).metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format ?? ""))
      return { ok: false, problem: "format" };
    const size = orientedSize(meta);
    const c = artistSquare(size.width, size.height);
    return {
      ok: true,
      image: await finish(
        sharp(bytes, INPUT)
          .rotate()
          .extract({ left: c.left, top: c.top, width: c.size, height: c.size })
          .resize(ARTIST_PHOTO_EDGE, ARTIST_PHOTO_EDGE),
      ),
    };
  } catch {
    return { ok: false, problem: "decode" };
  }
}
