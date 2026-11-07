import { test, expect, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { pushDevicesOf } from "./db";
import { newMember } from "./helpers";

// Step 5.12: SET-06 in the browser (D-071 option B, D-072). A browser in a test cannot reach a real push service,
// so the page's PushManager and permission are replaced by a stand-in that hands out a subscription on a push
// service address; everything after that (the server action, validation, encryption, the session binding, the
// switches, the pause) is the real thing. The global setup turns the "push" flag on when a VAPID pair exists.

test.skip(
  !(process.env.VAPID_PUBLIC_KEY || process.env.CI),
  "push needs a VAPID pair (.env.local or the CI step)",
);

/** A stand-in push subscription that survives navigations within the tab (sessionStorage). */
async function fakePush(page: Page) {
  await page.addInitScript(() => {
    const KEY = "e2e-push-sub";
    const make = (endpoint: string) => ({
      endpoint,
      options: { applicationServerKey: null },
      toJSON: () => ({
        endpoint,
        keys: {
          p256dh:
            "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
          auth: "tBHItJI5svbpez7KI4CCXg",
        },
      }),
      unsubscribe: async () => {
        sessionStorage.removeItem(KEY);
        return true;
      },
    });
    Object.defineProperty(Notification, "permission", { get: () => "granted" });
    Notification.requestPermission = async () => "granted";
    PushManager.prototype.getSubscription = async function () {
      const e = sessionStorage.getItem(KEY);
      return (e ? make(e) : null) as unknown as PushSubscription;
    };
    PushManager.prototype.subscribe = async function () {
      const e = `https://fcm.googleapis.com/fcm/send/e2e-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(KEY, e);
      return make(e) as unknown as PushSubscription;
    };
  });
}

test.describe("Notifications (SET-06)", () => {
  test("this device on, the types, the reminder, the pause, and off again", async ({ page }) => {
    test.slow();
    await fakePush(page);
    const email = await newMember(page, "push");

    await page.goto("/settings");
    await page.getByRole("link", { name: /Obavijesti.*Podsjetnik isključen/ }).click();
    await expect(page).toHaveURL(/\/settings\/notifications$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Obavijesti");

    const device = page.getByRole("switch", { name: /Obavijesti na ovom (mobitelu|uređaju)/ });
    await expect(device).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText(/^Isključene\./)).toBeVisible();
    // The types are quiet while this device is off.
    await expect(page.getByRole("switch", { name: "Komentari na moje odgovore" })).toBeDisabled();
    await expectNoAxeViolations(page);

    // On: the subscription reaches the server, and the types wake up with the D-072 defaults.
    await device.click();
    await expect(device).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Uključene. Odaberi koje ispod.")).toBeVisible();
    await expect.poll(async () => (await pushDevicesOf(email)).length).toBe(1);
    const comments = page.getByRole("switch", { name: "Komentari na moje odgovore" });
    const reactions = page.getByRole("switch", { name: "Reakcije" });
    await expect(comments).toBeEnabled();
    await expect(comments).toHaveAttribute("aria-checked", "true");
    await expect(reactions).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("switch", { name: "Pratitelji i zahtjevi" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expectNoAxeViolations(page);

    // A type and the reminder save at once and survive a reload.
    await reactions.click();
    await expect(reactions).toHaveAttribute("aria-checked", "true");
    await page.getByRole("switch", { name: "Podsjetnik za novo pitanje" }).click();
    await page.getByLabel("Vrijeme", { exact: true }).selectOption("20:00");
    await expect(page.getByLabel("Vrijeme", { exact: true })).toHaveValue("20:00");
    await page.waitForTimeout(500); // the last save is in flight
    await page.reload();
    await expect(device).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("switch", { name: "Reakcije" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("switch", { name: "Podsjetnik za novo pitanje" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // Pause for an hour: the device says until when, the types go quiet; "Uključi odmah" ends it.
    await page.getByRole("button", { name: "1 sat" }).click();
    await expect(page.getByText(/^Pauzirano do /)).toBeVisible();
    await expect(page.getByRole("switch", { name: "Reakcije" })).toBeDisabled();
    await expect.poll(async () => (await pushDevicesOf(email))[0]?.paused).toBe(true);
    await page.getByRole("button", { name: "Uključi odmah" }).click();
    await expect(page.getByText("Uključene. Odaberi koje ispod.")).toBeVisible();
    await expect.poll(async () => (await pushDevicesOf(email))[0]?.paused).toBe(false);

    // The Settings row shows the reminder time.
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /Obavijesti.*Podsjetnik u 20:00/ })).toBeVisible();

    // Off: removed on the server and in the browser.
    await page.goto("/settings/notifications");
    await device.click();
    await expect(device).toHaveAttribute("aria-checked", "false");
    await expect.poll(async () => (await pushDevicesOf(email)).length).toBe(0);
  });

  test("the service worker is served fresh, with its own narrow policy", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-cache");
    expect(res.headers()["content-security-policy"]).toContain("default-src 'self'");
    const body = await res.text();
    expect(body).toContain('addEventListener("push"');
    expect(body).not.toContain('addEventListener("fetch"');
  });
});
