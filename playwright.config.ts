import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  // The dev server compiles routes on first use, and every test that needs a member walks the whole onboarding
  // (step 5.4) before its own steps; two workers share one dev server.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    locale: "hr-HR",
    timezoneId: "Europe/Zagreb",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } },
    },
  ],
  webServer: {
    // CI builds first (`npm run build`), then this serves the production build.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // CI shows the server's own output, so a server that refuses to start explains itself in the log.
    stdout: process.env.CI ? "pipe" : "ignore",
    stderr: "pipe",
    env: {
      ...process.env,
      PORT: process.env.PORT ?? "3000",
      // Security email goes to a local file so the tests can follow the links.
      EMAIL_TRANSPORT: "file",
      EMAIL_FILE: ".mail-outbox.jsonl",
      E2E_EMAIL_FILE: "1", // the only way the file transport is accepted in production mode (CI)
      E2E_SPECIMENS: "1", // the Spirala specimen page (src/app/[locale]/specimen) for the shell tests
    },
  },
});
