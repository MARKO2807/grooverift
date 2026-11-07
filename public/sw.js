// GrooveRift service worker (step 5.12), hand-written, registered only while the "push" flag is on.
//
// It does two things: shows the notification the server sent, and opens its page when the member taps it. It
// has no fetch handler and caches nothing: personalised pages must never be stored on the device (ADR-0002 §3),
// so the app behaves exactly as without it. The payload is { title, body, url, tag } and never carries member
// content (src/lib/push/rules.ts); the page the tap opens checks access again.

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-mono-96.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Only a path on this site; anything else opens Activity. */
function safePath(url) {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return "/activity";
  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin !== self.location.origin || parsed.pathname.startsWith("//"))
      return "/activity";
    return parsed.pathname + parsed.search;
  } catch {
    return "/activity";
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "GrooveRift";
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: ICON,
    badge: BADGE,
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: { url: safePath(data.url) },
  };
  // Every push shows a notification (browsers require it, and there is nothing silent to do).
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safePath(event.notification.data && event.notification.data.url);
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
