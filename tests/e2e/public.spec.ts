import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";

test.describe("public pages (PUB-10, PUB-11, PUB-12, SYS-03)", () => {
  for (const [path, h1] of [
    ["/legal/terms", "Uvjeti korištenja"],
    ["/legal/privacy", "Pravila privatnosti"],
    ["/legal/guidelines", "Pravila zajednice"],
    ["/legal/cookies", "Kolačići"],
    ["/legal/contact", "Kontakt"],
  ] as const) {
    test(`${path} is a marked draft`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
      await expect(page.getByText("Nacrt, čeka pravni pregled")).toBeVisible();
    });
  }

  test("legal pages and the alpha page have no axe-core violations", async ({ page }) => {
    for (const p of ["/legal/terms", "/about/alpha", "/offline"]) {
      await page.goto(p);
      await expectNoAxeViolations(page);
    }
  });

  test("about the alpha names limitations, feedback, data and what comes after", async ({
    page,
  }) => {
    await page.goto("/about/alpha");
    for (const name of [
      "Što radi",
      "Poznata ograničenja",
      "Povratne informacije",
      "Tvoji podaci",
      "Što nakon alfe",
    ])
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  });

  test("the offline page explains and offers a retry", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nisi na mreži");
    await expect(page.getByRole("button", { name: "Pokušaj ponovno" })).toBeVisible();
  });
});

test.describe("DSA notice form (PUB-11)", () => {
  test("works without an account, names each missing field, then accepts the notice", async ({
    page,
  }) => {
    await page.goto("/legal/notice");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prijavi nezakonit sadržaj");
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Pošalji prijavu" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Prijava nije poslana");
    await expect(page.getByText("Odaberi što prijavljuješ.")).toBeVisible();
    await expect(page.getByText("Upiši poveznicu na sadržaj.")).toBeVisible();
    await expect(page.getByText("Potvrdi da su podaci točni.")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByLabel("Prijevara").check();
    await page.getByLabel("Poveznica na sadržaj").fill("https://grooverift.com/@netko");
    await page
      .getByLabel("Zašto je sadržaj nezakonit?")
      .fill("Lažno predstavljanje radi prijevare.");
    await page.getByLabel("Ime i prezime").fill("Testna Osoba");
    await page.getByLabel("E-pošta").fill("prijava@example.test");
    await page.getByLabel(/Iskreno vjerujem/).check();
    await page.getByRole("button", { name: "Pošalji prijavu" }).click();
    await expect(page.getByRole("heading", { name: "Prijava je zaprimljena" })).toBeFocused();
  });

  test("name and email are optional for child sexual abuse reports", async ({ page }) => {
    await page.goto("/legal/notice");
    await page.getByLabel("Seksualno zlostavljanje djece").check();
    await expect(page.getByText("ime i e-pošta nisu obavezni")).toBeVisible();
    await page.getByLabel("Poveznica na sadržaj").fill("https://grooverift.com/@netko");
    await page.getByLabel("Zašto je sadržaj nezakonit?").fill("Opis.");
    await page.getByLabel(/Iskreno vjerujem/).check();
    await page.getByRole("button", { name: "Pošalji prijavu" }).click();
    await expect(page.getByRole("heading", { name: "Prijava je zaprimljena" })).toBeVisible();
  });
});
