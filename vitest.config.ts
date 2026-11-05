import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    // Database-backed suites live in tests/db and run with `npm run test:db` (DATABASE_URL set).
    exclude: ["node_modules", ".next", "design", "docs", "tests/e2e", "tests/db"],
    setupFiles: ["./tests/setup.ts"],
  },
});
