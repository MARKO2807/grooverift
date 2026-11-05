// Frame-time measurement for the Spirala (plan 5.1, risk 12): the specimen page at 360 px with the CPU throttled
// (default 4x, a mid-range phone), five genres and three artists. Reports the median and p95 of the time
// between animation frames over 4 seconds and a screenshot. Usage:
//   node scripts/spirala-perf.mjs <out-dir> [base-url] [throttle]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const out = resolve(process.argv[2] ?? ".");
const base = process.argv[3] ?? "http://localhost:3000";
const rate = Number(process.argv[4] ?? 4);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
const cdp = await page.context().newCDPSession(page);
await page.goto(`${base}/specimen`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await cdp.send("Emulation.setCPUThrottlingRate", { rate });
const gaps = await page.evaluate(
  () =>
    new Promise((done) => {
      const ts = [];
      const step = (t) => {
        ts.push(t);
        if (t - ts[0] < 4000) requestAnimationFrame(step);
        else done(ts.slice(1).map((x, i) => x - ts[i]));
      };
      requestAnimationFrame(step);
    }),
);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await page.screenshot({ path: join(out, "spirala-360.png"), fullPage: true });
await browser.close();

const s = [...gaps].sort((a, b) => a - b);
const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
console.log(
  `CPU ${rate}x: ${gaps.length} frames in 4 s, median ${q(0.5)} ms, p95 ${q(0.95)} ms (budget 16.7 ms at 60 fps, 33.3 ms at 30 fps)`,
);
