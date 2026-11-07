// Encryption of the push subscription keys at rest (step 5.12, schema comment on push_subscription). The p256dh
// and auth keys let anyone holding them (and our VAPID key) write to the member's device, so the database keeps
// them only as AES-256-GCM ciphertext. The key is derived from BETTER_AUTH_SECRET with HKDF, so there is no extra
// secret to manage; rotating that secret makes the stored keys unreadable, and those subscriptions are dropped at
// the next delivery (the member turns notifications on again).
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

export type SubscriptionKeys = { p256dh: string; auth: string };

const VERSION = "v1";
let cached: { secret: string; key: Buffer } | undefined;

function key(): Buffer {
  const secret = env().BETTER_AUTH_SECRET;
  if (cached?.secret === secret) return cached.key;
  const derived = Buffer.from(
    hkdfSync("sha256", secret, "grooverift.push", "push-subscription-keys", 32),
  );
  cached = { secret, key: derived };
  return derived;
}

export function sealKeys(keys: SubscriptionKeys): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(keys), "utf8"), cipher.final()]);
  return `${VERSION}.${Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url")}`;
}

/** The keys, or null when the value cannot be read (another secret, tampering, an unknown version). */
export function openKeys(sealed: string): SubscriptionKeys | null {
  try {
    const [version, data] = sealed.split(".");
    if (version !== VERSION || !data) return null;
    const raw = Buffer.from(data, "base64url");
    if (raw.length < 12 + 16 + 1) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const text = Buffer.concat([
      decipher.update(raw.subarray(12, raw.length - 16)),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(text) as Partial<SubscriptionKeys>;
    if (typeof parsed.p256dh !== "string" || typeof parsed.auth !== "string") return null;
    return { p256dh: parsed.p256dh, auth: parsed.auth };
  } catch {
    return null;
  }
}
