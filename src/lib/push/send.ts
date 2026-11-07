// Delivery to one device through its browser's push service (step 5.12), with the VAPID key pair from the
// environment. Best effort: 404 and 410 mean the subscription is gone; anything else is a failure counted by the
// caller. The endpoint is only ever one of the known push services (allowedEndpoint), so a member cannot make
// the server send requests to an address of their choosing.
import webpush, { WebPushError } from "web-push";
import { env } from "@/lib/env";
import type { SubscriptionKeys } from "./crypto";
import type { PushPayload } from "./rules";

/** Push service hosts of the browsers we support (Chrome and Android, Safari, Firefox, Edge). */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^(?:[a-z0-9-]+\.)*push\.apple\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];
export const ENDPOINT_MAX = 1024;

export function allowedEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > ENDPOINT_MAX) return false;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
    return PUSH_HOSTS.some((h) => h.test(url.hostname));
  } catch {
    return false;
  }
}

/** True when the VAPID pair is configured; without it push is unavailable everywhere. */
export function pushConfigured(): boolean {
  const e = env();
  return !!(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY);
}

export const vapidPublicKey = (): string | null => env().VAPID_PUBLIC_KEY ?? null;

export type SendOutcome = "sent" | "gone" | "failed";

/** A test seam: the db tests replace the transport and look at what would have been sent. */
export type Transport = (
  target: { endpoint: string; keys: SubscriptionKeys },
  payload: PushPayload,
  opts: { ttl: number; urgency: "normal" | "high"; topic?: string },
) => Promise<SendOutcome>;

const webPushTransport: Transport = async (target, payload, opts) => {
  const e = env();
  if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return "failed";
  if (!allowedEndpoint(target.endpoint)) return "gone";
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: target.keys },
      JSON.stringify(payload),
      {
        TTL: opts.ttl,
        urgency: opts.urgency,
        topic: opts.topic,
        timeout: 10_000,
        vapidDetails: {
          subject: e.APP_URL,
          publicKey: e.VAPID_PUBLIC_KEY,
          privateKey: e.VAPID_PRIVATE_KEY,
        },
      },
    );
    return "sent";
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410))
      return "gone";
    // Never the endpoint or the payload in the log: the status code and the push service host only.
    const status = error instanceof WebPushError ? error.statusCode : "network";
    console.error("[push] delivery failed:", status, new URL(target.endpoint).hostname);
    return "failed";
  }
};

let transport: Transport = webPushTransport;

export function sendPush(...args: Parameters<Transport>): Promise<SendOutcome> {
  return transport(...args);
}

/** Tests only. */
export function setTransportForTests(t: Transport | null): void {
  transport = t ?? webPushTransport;
}
