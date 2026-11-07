import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { sha256Hex, signV4 } from "./sigv4";

// Object storage for images (step 5.11). No "server-only" import here or in src/lib/media/process.ts: the worker and
// `npm run job` load these under tsx, outside Next, where that import throws. Cloudflare R2 in the EU jurisdiction (A7, D-113) on Render; a local folder
// for development and the end-to-end tests (MEDIA_STORE=file, refused in production unless the e2e flag is set, as
// for the email file transport). Keys are opaque ("<kind>/<uuid>.webp"); nothing in a key names a member. Objects
// are never public: every read goes through /api/media/<id>, which asks the policy first.

export type StoredObject = { bytes: Buffer; contentType: string };

const KEY = /^[a-z_]+\/[0-9a-f-]{36}\.webp$/;

function assertKey(key: string) {
  if (!KEY.test(key)) throw new Error("invalid storage key");
}

export function storeKind(): "r2" | "file" {
  const e = env();
  if (e.MEDIA_STORE) return e.MEDIA_STORE;
  return e.R2_ENDPOINT && e.R2_BUCKET && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY
    ? "r2"
    : "file";
}

// ------------------------------------------------------------------ R2

function r2() {
  const e = env();
  if (!e.R2_ENDPOINT || !e.R2_BUCKET || !e.R2_ACCESS_KEY_ID || !e.R2_SECRET_ACCESS_KEY)
    throw new Error(
      "R2 is not configured (R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
    );
  return {
    base: new URL(e.R2_ENDPOINT),
    bucket: e.R2_BUCKET,
    accessKeyId: e.R2_ACCESS_KEY_ID,
    secretAccessKey: e.R2_SECRET_ACCESS_KEY,
  };
}

async function r2Call(
  method: "PUT" | "GET" | "DELETE",
  key: string,
  body?: Buffer,
  contentType?: string,
) {
  const c = r2();
  const url = new URL(`/${c.bucket}/${key}`, c.base);
  const headers = signV4({
    method,
    url,
    headers: body && contentType ? { "content-type": contentType } : {},
    payloadHash: sha256Hex(body ?? ""),
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
    region: "auto",
  });
  return fetch(url, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
}

// ------------------------------------------------------------------ local folder

function fileRoot() {
  return path.resolve(process.cwd(), env().MEDIA_DIR);
}
const filePath = (key: string) => path.join(fileRoot(), ...key.split("/"));

// ------------------------------------------------------------------ the three operations

export async function putObject(key: string, bytes: Buffer, contentType: string): Promise<void> {
  assertKey(key);
  if (storeKind() === "r2") {
    const res = await r2Call("PUT", key, bytes, contentType);
    if (!res.ok) throw new Error(`storage put failed (${res.status})`);
    return;
  }
  const p = filePath(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, bytes);
}

export async function getObject(key: string): Promise<StoredObject | null> {
  assertKey(key);
  if (storeKind() === "r2") {
    const res = await r2Call("GET", key);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`storage get failed (${res.status})`);
    return { bytes: Buffer.from(await res.arrayBuffer()), contentType: "image/webp" };
  }
  try {
    return { bytes: await readFile(filePath(key)), contentType: "image/webp" };
  } catch {
    return null;
  }
}

/** Deleting a missing object is not an error (the purge may run twice). */
export async function deleteObject(key: string): Promise<void> {
  assertKey(key);
  if (storeKind() === "r2") {
    const res = await r2Call("DELETE", key);
    if (!res.ok && res.status !== 404) throw new Error(`storage delete failed (${res.status})`);
    return;
  }
  await rm(filePath(key), { force: true });
}
