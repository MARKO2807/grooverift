// Shared Vitest setup. Tests must never read a real environment file.
const testEnv: Record<string, string> = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0000",
  DATABASE_URL: "postgres://grooverift:grooverift@127.0.0.1:5432/grooverift",
  EMAIL_TRANSPORT: "none",
};
for (const [k, v] of Object.entries(testEnv)) if (!process.env[k]) process.env[k] = v;
