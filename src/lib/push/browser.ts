// Browser side of push (step 5.12): what this browser can do, the service worker, the permission and the
// subscription. Client components only. The permission prompt is asked only from a tap on "Uključi" (IA §14),
// never on page load.

export type PushSupport = "supported" | "needs-install" | "unsupported";
export type BrowserPushState = {
  support: PushSupport;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

const SW_URL = "/sw.js";

function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points tell them apart.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const apis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // On iPhone and iPad, web push exists only in a site added to the Home Screen (iOS 16.4+).
  if (isAppleMobile() && !isStandalone()) return "needs-install";
  return apis ? "supported" : "unsupported";
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function browserPushState(): Promise<BrowserPushState> {
  const support = pushSupport();
  if (support !== "supported") return { support, permission: "unsupported", subscribed: false };
  return {
    support,
    permission: Notification.permission,
    subscribed: !!(await currentSubscription()),
  };
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return true; // some browsers do not expose it; keep the subscription
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

export type SubscribeOutcome =
  | { ok: true; subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }
  | { ok: false; reason: "denied" | "unsupported" | "needs-install" | "failed" };

/** Ask for the permission (from a tap) and subscribe this browser; the caller sends the result to the server. */
export async function subscribeBrowser(publicKey: string): Promise<SubscribeOutcome> {
  const support = pushSupport();
  if (support !== "supported") return { ok: false, reason: support };
  try {
    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== "granted") return { ok: false, reason: "denied" };
    const reg = await registration();
    const key = keyBytes(publicKey);
    let existing = await reg.pushManager.getSubscription();
    // A subscription made for another server key (the VAPID pair was changed) cannot be used: start again.
    if (existing && !sameKey(existing.options.applicationServerKey, key)) {
      await existing.unsubscribe();
      existing = null;
    }
    const sub =
      existing ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth)
      return { ok: false, reason: "failed" };
    return {
      ok: true,
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** Remove this browser's subscription (the server side is removed by the action). */
export async function unsubscribeBrowser(): Promise<void> {
  try {
    const sub = await currentSubscription();
    await sub?.unsubscribe();
  } catch {
    // Nothing to do: the server no longer sends to it either way.
  }
}
