// Database-backed test setup: needs DATABASE_URL (docker compose up -d, npm run db:migrate).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const testEnv: Record<string, string> = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0000",
  DATABASE_URL: "postgres://grooverift:grooverift@127.0.0.1:5432/grooverift",
  EMAIL_TRANSPORT: "none",
};
for (const [k, v] of Object.entries(testEnv)) if (!process.env[k]) process.env[k] = v;

// Step 5.11: data modules now reach storage and image code marked "server-only"; tests run outside React.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
