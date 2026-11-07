import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { test, expect, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { publishTestQuestion, removeQuestions } from "./db";
import { newMember } from "./helpers";

// Step 5.11 in the browser: the profile photo with the crop step (D-078), an answer with an image, a description and
// an artist card (D-121, D-119 (6), (7)), the image viewer, the visitor refused by /api/media, and the artist photo's
// "O fotografiji" credit (D-118). Images are made here; storage is the local folder (MEDIA_STORE=file) and Wikidata
// and Commons are the offline stub (CATALOG_STUB=1).

const questions: string[] = [];
test.afterAll(async () => {
  await removeQuestions(questions);
});

/** A phone photo: JPEG with EXIF (camera and a GPS position) that must not survive the upload. */
async function photo(colour = "#d04a5a") {
  const buffer = await sharp({
    create: { width: 900, height: 600, channels: 3, background: colour },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: "E2EPhone", Model: "GR-E2E" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "45/1 48/1 0/1" },
    })
    .toBuffer();
  return { name: "photo.jpg", mimeType: "image/jpeg", buffer };
}

async function choose(
  page: Page,
  click: () => Promise<void>,
  file: Awaited<ReturnType<typeof photo>>,
) {
  const chooser = page.waitForEvent("filechooser");
  await click();
  await (await chooser).setFiles(file);
}

/** Runs one worker job the way `npm run job` does, with the test server's storage and stub catalogue. */
function runJob(name: string) {
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "src/run-job.ts", name], {
    stdio: "pipe",
    shell: process.platform === "win32",
    env: { ...process.env, CATALOG_STUB: "1", MEDIA_STORE: "file", MEDIA_DIR: ".media-store" },
  });
}

test.describe("images (step 5.11)", () => {
  test("profile photo: sheet, crop with zoom and keys, stored without EXIF, shown in the avatar", async ({
    page,
  }) => {
    test.slow();
    await newMember(page, "pic");
    await page.goto("/settings/profile");
    await page.getByRole("button", { name: "Dodaj sliku" }).click();
    const sheet = page.getByRole("dialog", { name: "Slika profila" });
    await expect(sheet.getByText(/JPG, PNG ili WebP do 5 MB/)).toBeVisible();
    await expectNoAxeViolations(page);
    await choose(
      page,
      () => sheet.getByRole("button", { name: "Odaberi iz galerije" }).click(),
      await photo(),
    );

    const crop = page.getByRole("dialog", { name: "Namjesti sliku" });
    await expect(crop).toBeVisible();
    await crop.getByLabel("Povećanje").fill("1.6");
    await crop.getByRole("group", { name: /Slika u krugu/ }).focus();
    await page.keyboard.press("ArrowLeft");
    await crop.getByRole("button", { name: "Pomakni gore" }).click();
    await expectNoAxeViolations(page);
    await crop.getByRole("button", { name: "Spremi" }).click();
    await expect(page.getByText("Slika profila je spremljena.")).toBeVisible();

    const img = page.locator(".photo-row .avatar img");
    await expect(img).toHaveAttribute("src", /^\/api\/media\/[0-9a-f-]{36}$/);
    const src = (await img.getAttribute("src"))!;
    const res = await page.request.get(src);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/webp");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    const body = await res.body();
    expect(body.includes(Buffer.from("E2EPhone"))).toBe(false);
    expect((await sharp(body).metadata()).exif).toBeUndefined();
    expect([(await sharp(body).metadata()).width, (await sharp(body).metadata()).height]).toEqual([
      512, 512,
    ]);

    // "Promijeni sliku" now, and the photo can be removed.
    await page.getByRole("button", { name: "Promijeni sliku" }).click();
    await page
      .getByRole("dialog", { name: "Slika profila" })
      .getByRole("button", { name: "Ukloni sliku" })
      .click();
    await expect(page.getByText("Slika profila je uklonjena.")).toBeVisible();
    expect((await page.request.get(src)).status()).toBe(404);
  });

  test("an answer with an image, a description and an artist card; visitors never get the image", async ({
    page,
    browser,
  }) => {
    test.slow();
    const q = await publishTestQuestion(`Slika i izvođač ${Date.now()}`);
    questions.push(q.id);
    await newMember(page, "img");
    await page.goto(`/drop/${q.date}`);
    await page.getByRole("button", { name: "Napiši svoj odgovor…" }).click();
    const dialog = page.getByRole("dialog", { name: "Tvoj odgovor" });
    await dialog.getByRole("textbox", { name: "Tvoj odgovor" }).fill("Moj gramofon i Radiohead.");

    await dialog.getByRole("button", { name: "Dodaj izvođača" }).click();
    await dialog.getByLabel("Pretraži izvođače").fill("Radiohead");
    await dialog
      .getByRole("list", { name: "Izvođači iz kataloga" })
      .getByRole("button", { name: /^Radiohead/ })
      .click();
    await expect(dialog.getByRole("list", { name: "Dodani izvođači" })).toContainText("Radiohead");

    await choose(
      page,
      () => dialog.getByRole("button", { name: "Dodaj sliku" }).click(),
      await photo("#2a7a5a"),
    );
    await dialog.getByLabel("Opis slike (neobavezno)").fill("Gramofon s pločom");
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Objavi" }).click();
    await expect(page.getByText("Odgovor je objavljen.")).toBeVisible();

    const open = page.getByRole("button", { name: "Otvori sliku: Gramofon s pločom" });
    await expect(open).toBeVisible();
    const card = page
      .getByRole("list", { name: "Izvođači" })
      .getByRole("link", { name: "Radiohead" });
    await expect(card).toHaveAttribute("href", /\/artist\/[0-9a-f-]{36}$/);
    await open.click();
    const viewer = page.getByRole("dialog", { name: "Slika" });
    await expect(viewer.getByRole("img", { name: "Gramofon s pločom" })).toBeVisible();
    await expectNoAxeViolations(page);
    await viewer.getByRole("button", { name: "Zatvori" }).click();
    await expect(open).toBeFocused();

    // D-022: a signed-out visitor gets nothing from the image URL.
    const src = (await open.locator("img").getAttribute("src"))!;
    const visitor = await browser.newContext();
    expect((await visitor.request.get(new URL(src, page.url()).href)).status()).toBe(404);
    await visitor.close();

    // The artist page shows the photo with its credit once the photo job has run (D-118).
    const artistHref = (await card.getAttribute("href"))!;
    runJob("catalog.photos");
    await page.goto(artistHref);
    await page.getByRole("button", { name: "O fotografiji" }).click();
    const credit = page.getByRole("dialog", { name: "O fotografiji" });
    await expect(credit.getByRole("link", { name: /Stub Fotograf/ })).toHaveAttribute(
      "href",
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
    );
    await expect(credit.getByRole("link", { name: /CC BY-SA 3\.0/ })).toBeVisible();
    await expect(credit.getByText("Fotografija je izrezana i smanjena.")).toBeVisible();
    await expect(credit.getByText(/dostupna je pod istom licencom/)).toBeVisible();
    await expect(credit.getByRole("link", { name: "Prijavi problem" })).toHaveAttribute(
      "href",
      /\/legal\/notice\?photo=/,
    );
    await expectNoAxeViolations(page);
    // CAT-01 lists the answer that names the artist.
    await credit.getByRole("button", { name: "Zatvori" }).click();
    await expect(page.getByRole("heading", { name: "U odgovorima" })).toBeVisible();
  });
});
