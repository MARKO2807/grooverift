import "server-only";
import { MAX_UPLOAD_BYTES } from "./rules";

/** Reads an uploaded file into memory, refusing anything over the limit before reading it (step 5.11). */
export async function fileBytes(
  file: FormDataEntryValue | null,
): Promise<Buffer | "tooLarge" | "empty"> {
  if (!(file instanceof File) || file.size === 0) return "empty";
  if (file.size > MAX_UPLOAD_BYTES) return "tooLarge";
  return Buffer.from(await file.arrayBuffer());
}
