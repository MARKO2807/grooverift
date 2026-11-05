import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { insertInvitation } from "./db";

export const SEED_PASSWORD = "Prototip-lozinka-1!";
export const OUTBOX = ".mail-outbox.jsonl";

export type Mail = { at: string; to: string; subject: string; text: string };

/** Mails sent to `to`, newest last (the file transport appends JSON lines). */
export function mailsTo(to: string): Mail[] {
  let text = "";
  try {
    text = readFileSync(OUTBOX, "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Mail)
    .filter((m) => m.to.toLowerCase() === to.toLowerCase());
}

export async function lastMailTo(to: string, after: number): Promise<Mail> {
  await expect
    .poll(() => mailsTo(to).filter((m) => Date.parse(m.at) >= after).length, { timeout: 10_000 })
    .toBeGreaterThan(0);
  const mails = mailsTo(to).filter((m) => Date.parse(m.at) >= after);
  return mails[mails.length - 1]!;
}

export const firstLink = (mail: Mail) => /https?:\/\/\S+/.exec(mail.text)?.[0] ?? "";

/** Submits the sign-in form and waits until the page either left /sign-in or shows an error notice. */
export async function signIn(page: Page, email: string, password = SEED_PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("E-pošta").fill(email);
  await page.getByLabel("Lozinka", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await Promise.race([
    page.waitForURL((u) => !/\/sign-in$/.test(u.pathname)),
    notice(page).first().waitFor(),
  ]);
}

/** Notices inside the page (not the Next.js dev overlay, not the empty toast region). */
export const notice = (page: Page) =>
  page.locator("main").getByRole("alert").or(page.locator("main").getByRole("status"));

// ---- TOTP (RFC 6238, SHA-1, 30 s, 6 digits) for the two-factor tests ----
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of input.replace(/=+$/, "").toUpperCase()) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totp(secretBase32: string, at = Date.now()): string {
  const counter = Math.floor(at / 1000 / 30);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secretBase32)).update(msg).digest();
  const offset = h[h.length - 1]! & 0xf;
  const code = (h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

export const uniqueUsername = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`
    .toLowerCase()
    .slice(0, 30);

// ---- Invitation and onboarding (step 5.4) ----

/** Opens the invitation link and creates the account with a password: invite → 18+ → language → account. */
export async function createAccountFromInvite(page: Page, email: string, password: string) {
  const { token } = await insertInvitation(email);
  await page.goto(`/invite/${token}`);
  await expect(page).toHaveURL(/\/join$/);
  await page.getByRole("link", { name: "Prihvati pozivnicu" }).click();
  await page.getByLabel("Da, imam 18 ili više").check();
  await page.getByRole("button", { name: "Nastavi" }).click();
  await expect(page).toHaveURL(/\/join\/language$/);
  await page.getByRole("button", { name: "Nastavi" }).click();
  await expect(page).toHaveURL(/\/join\/account$/);
  await page.getByLabel("Lozinka", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Napravi račun" }).click();
  await expect(page).toHaveURL(/\/join\/username$/);
}

/** The steps after the account, with the fewest choices: no reading languages, a public profile, no picks. */
export async function finishOnboarding(
  page: Page,
  opts: { username?: string; displayName?: string; visibility?: "Javno" | "Privatno" } = {},
) {
  // Starts from whichever step the page is on (a resumed member may already be past the username).
  if (/\/join\/username$/.test(page.url())) {
    await page.getByLabel("Ime za prikaz").fill(opts.displayName ?? "Testna Osoba");
    await page.getByLabel("Korisničko ime").fill(opts.username ?? uniqueUsername("t"));
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/reading$/);
  }
  if (/\/join\/reading$/.test(page.url())) {
    await page.getByRole("button", { name: "Nastavi" }).click();
  }
  await expect(page).toHaveURL(/\/join\/visibility$/);
  await page.getByLabel(opts.visibility ?? "Javno").check();
  await page.getByRole("button", { name: "Nastavi" }).click();
  await expect(page).toHaveURL(/\/join\/dna$/);
  await page.getByRole("button", { name: "Preskoči" }).click();
  await expect(page).toHaveURL(/\/join\/how$/);
  await page.getByRole("button", { name: "Nastavi" }).click();
  // The reminder step appears only while the push flag is on (D-093 (1)).
  if (/\/join\/reminder$/.test(page.url())) {
    await page.getByRole("button", { name: "Ne sada" }).click();
  }
  await expect(page).toHaveURL(/\/join\/done$/);
  await page.getByRole("link", { name: "Na početnu" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

/**
 * A fresh, onboarded member signed in on `page`, created through a real invitation and the whole onboarding
 * (J1). Tests that change a member's own data use one, so the phone and desktop runs never share state.
 */
export async function newMember(page: Page, prefix: string, password = "Nova-Lozinka-2026!") {
  const email = uniqueEmail(prefix);
  await createAccountFromInvite(page, email, password);
  await finishOnboarding(page);
  return email;
}
