import { createHash, createHmac } from "node:crypto";

// AWS Signature Version 4 for S3-compatible requests (Cloudflare R2, A7 / D-113). Built on node:crypto so the
// storage check needs no SDK; step 5.11 may replace it with @aws-sdk/client-s3 (approved for then).

export type SignInput = {
  method: string;
  url: URL;
  /** Extra headers to sign and send (lower-case names); `host`, `x-amz-date` and `x-amz-content-sha256` are added. */
  headers?: Record<string, string>;
  /** Hex SHA-256 of the body (`sha256Hex("")` for none). */
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
  date?: Date;
};

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/** RFC 3986 encoding as SigV4 wants it (keeps A–Z a–z 0–9 - . _ ~). */
function encode(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** "20130524T000000Z" */
export function amzDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Returns the headers to send: the given ones plus x-amz-date, x-amz-content-sha256 and authorization. */
export function signV4(input: SignInput): Record<string, string> {
  const service = input.service ?? "s3";
  const stamp = amzDate(input.date ?? new Date());
  const day = stamp.slice(0, 8);

  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v.trim()]),
    ),
    "x-amz-content-sha256": input.payloadHash,
    "x-amz-date": stamp,
  };
  const signed: Record<string, string> = { host: input.url.host, ...headers };
  const names = Object.keys(signed).sort();

  const canonicalUri = input.url.pathname
    .split("/")
    .map((seg) => encode(decodeURIComponent(seg)))
    .join("/");
  const canonicalQuery = [...input.url.searchParams.entries()]
    .map(([k, v]) => [encode(k), encode(v)] as const)
    .sort(([a, x], [b, y]) => (a === b ? (x < y ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    names.map((n) => `${n}:${signed[n]}\n`).join(""),
    names.join(";"),
    input.payloadHash,
  ].join("\n");

  const scope = `${day}/${input.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${input.secretAccessKey}`, day);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
  };
}
