import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Database-backed suites: `npm run test:db` (DATABASE_URL must point at a migrated database).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    setupFiles: ["./tests/db/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
