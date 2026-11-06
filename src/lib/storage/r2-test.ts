// `npm run r2:test`: proves from a deployed service (Render shell) that the R2 variables work (A7, D-113).
// Writes one small object, reads it back, deletes it and checks that it is gone. Prints only the endpoint host,
// the bucket and HTTP status codes; never the keys.
import { env } from "@/lib/env";
import { sha256Hex, signV4 } from "./sigv4";

async function call(method: string, url: URL, body?: string) {
  const e = env();
  const payload = body ?? "";
  const headers = signV4({
    method,
    url,
    headers: body ? { "content-type": "text/plain; charset=utf-8" } : {},
    payloadHash: sha256Hex(payload),
    accessKeyId: e.R2_ACCESS_KEY_ID!,
    secretAccessKey: e.R2_SECRET_ACCESS_KEY!,
    region: "auto",
  });
  return fetch(url, { method, headers, body: body ?? undefined });
}

async function main() {
  const e = env();
  const missing = (
    ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const
  ).filter((k) => !e[k]);
  if (missing.length) {
    console.error(`[r2:test] missing: ${missing.join(", ")}`);
    process.exit(1);
  }
  const base = new URL(e.R2_ENDPOINT!);
  const key = `healthcheck/r2-test-${Date.now()}.txt`;
  const url = new URL(`/${e.R2_BUCKET}/${key}`, base);
  const text = `GrooveRift R2 test ${new Date().toISOString()}`;
  console.log(`[r2:test] endpoint ${base.host}, bucket ${e.R2_BUCKET}`);

  const put = await call("PUT", url, text);
  console.log(`[r2:test] PUT ${put.status}`);
  const get = await call("GET", url);
  const back = await get.text();
  console.log(`[r2:test] GET ${get.status}, same content: ${back === text}`);
  const del = await call("DELETE", url);
  console.log(`[r2:test] DELETE ${del.status}`);
  const gone = await call("GET", url);
  console.log(`[r2:test] GET after delete ${gone.status}`);

  const ok = put.ok && get.ok && back === text && del.ok && gone.status === 404;
  console.log(ok ? "[r2:test] OK" : "[r2:test] FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error("[r2:test] error:", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
