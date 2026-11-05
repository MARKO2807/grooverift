import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import { readFileSync } from "node:fs";

// Step 5.2: product tables are read and written only through the data-access layer (src/lib/data), which asks
// the policy module (src/lib/authz). The names are read from the schema file so new tables are covered.
const productTables = [
  ...readFileSync(new URL("./src/lib/db/schema/product.ts", import.meta.url), "utf8").matchAll(
    /^export const (\w+)/gm,
  ),
].map((m) => m[1]);
const dataLayerOnly = "Product tables go through src/lib/data (policy-checked), never directly.";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Accessibility rules are a baseline requirement (CLAUDE.md, WCAG 2.2 AA).
      // eslint-config-next enables jsx-a11y as warnings; errors here so CI fails.
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/tabindex-no-positive": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    // auth.ts hands the whole schema to the Better Auth adapter, which reads only its own tables.
    ignores: ["src/lib/data/**", "src/lib/db/**", "src/lib/auth/auth.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@/lib/db/schema", importNames: productTables, message: dataLayerOnly }],
          patterns: [
            { group: ["@/lib/db/schema/product", "**/schema/product"], message: dataLayerOnly },
          ],
        },
      ],
    },
  },
  {
    // Pages and components never talk to the database: they call src/lib modules (review M5). The Phase 4 admin
    // pages read auth and audit tables behind adminPageGate and are the one exception until 5.9 moves them.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/app/[[]locale[]]/(app)/admin/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db/*", "**/lib/db/*", "**/db/schema", "**/db/schema/*"],
              message: dataLayerOnly,
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "node_modules/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "design/**",
    "docs/**",
    "next-env.d.ts",
  ]),
]);
