// Screenshot pass on the running app (step 5.1), like design/prototypes/tools/pulse-smoke.mjs but through
// Playwright: every public and signed-in shell page at 360, 800, 1366 and 1920 px. Checks that nothing scrolls
// sideways, that exactly one main navigation is visible on signed-in pages (tab bar below 600 px, rail from
// 600 px) and that the page has one h1. Screenshots go to the directory given as the first argument (keep them
// out of the repo, e.g. the session scratchpad).
//
// Usage: node scripts/screens.mjs <out-dir> [base-url]   (the app must be running; seeded database)
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { chromium } from "@playwright/test";

const out = process.argv[2];
if (!out) {
  console.error("usage: node scripts/screens.mjs <out-dir> [base-url]");
  process.exit(2);
}
const base = process.argv[3] ?? "http://localhost:3000";
const dir = resolve(out);
mkdirSync(dir, { recursive: true });

// 180 px is a 360 px phone at 200 % zoom: the large-text mode (D-073).
const WIDTHS = [180, 360, 800, 1366, 1920];
const PUBLIC = [
  "/",
  "/@ana", // PUB-08
  "/legal/terms",
  "/legal/notice",
  "/about/alpha",
  "/offline",
  "/@nobody",
  "/sign-in",
  "/en", // last: it sets the English locale cookie
];
const MEMBER = [
  "/home",
  "/hub",
  "/activity",
  "/me",
  "/settings",
  "/settings/help",
  "/settings/security",
  "/settings/profile",
  "/settings/privacy",
  "/@luka", // another member (step 5.5)
  "/@mia", // a private profile: the P state
  "/@luka/followers",
  "/search?q=luka",
  "/activity/requests",
  "/settings/status", // SAFE-04/05 hub (step 5.9)
  "/settings/status/notices",
  "/settings/status/reports",
  "/settings/blocked", // SAFE-08
  "/@nobody",
];

const findings = [];
const browser = await chromium.launch();

async function check(page, path, w, signedIn) {
  const res = await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const name = `${signedIn ? "m" : "v"}${path.replace(/[^a-z0-9]+/gi, "_") || "_root"}-${w}.png`;
  await page.screenshot({ path: join(dir, name), fullPage: true });
  const r = await page.evaluate(() => {
    const vis = (el) =>
      !!el && getComputedStyle(el).display !== "none" && el.getClientRects().length > 0;
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: [...document.querySelectorAll("h1")].length,
      navs: [
        ...document.querySelectorAll(
          'nav[aria-label="Glavna navigacija"], nav[aria-label="Main navigation"]',
        ),
      ].filter(vis).length,
      rail: vis(document.querySelector(".rail")),
    };
  });
  const tag = `${signedIn ? "member" : "visitor"} ${path} @${w}`;
  if (r.overflow > 0) findings.push(`${tag}: scrolls sideways by ${r.overflow}px`);
  if (r.h1 !== 1) findings.push(`${tag}: ${r.h1} h1 elements`);
  const isShell = signedIn && path !== "/@nobody" ? true : signedIn;
  if (isShell && r.navs !== 1) findings.push(`${tag}: ${r.navs} visible main navigations`);
  if (isShell && w >= 600 !== r.rail) findings.push(`${tag}: rail visible=${r.rail}`);
  return { tag, status: res?.status(), ...r };
}

const rows = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: "hr-HR" });
  const page = await ctx.newPage();
  for (const p of PUBLIC) rows.push(await check(page, p, w, false));
  await ctx.clearCookies();
  await page.goto(base + "/sign-in");
  await page.getByLabel("E-pošta").fill("ana@example.test");
  await page.getByLabel("Lozinka", { exact: true }).fill("Prototip-lozinka-1!");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await page.waitForURL(/\/home$/);
  for (const p of MEMBER) rows.push(await check(page, p, w, true));
  await ctx.close();
}
await browser.close();

for (const r of rows)
  console.log(`${r.status} ${r.tag} overflow=${r.overflow} h1=${r.h1} navs=${r.navs}`);
console.log(`\n${rows.length} views, screenshots in ${dir}`);
if (findings.length) {
  console.error(`\n${findings.length} finding(s):\n- ${findings.join("\n- ")}`);
  process.exit(1);
}
console.log("no findings");
